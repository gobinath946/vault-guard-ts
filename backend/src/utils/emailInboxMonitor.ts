import Imap from 'imap';
import { simpleParser, ParsedMail } from 'mailparser';
import HardwareAllocationRequest from '../models/HardwareAllocationRequest';
import HardwareAllocation from '../models/HardwareAllocation';
import HardwareAsset from '../models/HardwareAsset';
import Company from '../models/Company';
import { logAllocationCreate } from './assetLogger';
import { processAllocationApproval } from './emailService';

interface EmailConfig {
  user: string;
  password: string;
  host: string;
  port: number;
  tls: boolean;
}

export const monitorInboxForApprovals = async (emailConfig: EmailConfig): Promise<any[]> => {
  return new Promise((resolve, reject) => {
    const imap = new Imap({
      user: emailConfig.user,
      password: emailConfig.password,
      host: emailConfig.host,
      port: emailConfig.port,
      tls: emailConfig.tls,
      tlsOptions: { rejectUnauthorized: false }
    });

    imap.once('ready', () => {
      imap.openBox('INBOX', false, (err: Error | null) => {
        if (err) {
          reject(err);
          return;
        }

        // Search for unseen emails
        imap.search(['UNSEEN'], (err: Error | null, results: number[]) => {
          if (err) {
            reject(err);
            return;
          }

          if (results.length === 0) {
            imap.end();
            resolve([]);
            return;
          }

          const fetch = imap.fetch(results, { bodies: '' });
          const emails: any[] = [];

          fetch.on('message', (msg: any) => {
            msg.on('body', (stream: any) => {
              simpleParser(stream, async (err: Error | null, parsed: ParsedMail) => {
                if (err) {
                  console.error('Error parsing email:', err);
                  return;
                }

                const subject = parsed.subject || '';
                const text = parsed.text || '';
                const from = parsed.from?.text || '';

                // Check if email contains APPROVED or REJECTED keywords
                const isApproved = /\bAPPROVED\b/i.test(text);
                const isRejected = /\bREJECTED\b/i.test(text);

                if (isApproved || isRejected) {
                  // Extract request ID from subject or body
                  const requestIdMatch = subject.match(/Request ID: ([a-f0-9]{24})/i) ||
                    text.match(/Request ID: ([a-f0-9]{24})/i);

                  if (requestIdMatch) {
                    const requestId = requestIdMatch[1];

                    try {
                      await processEmailApproval(requestId, isApproved ? 'APPROVED' : 'REJECTED');
                      emails.push({
                        from,
                        subject,
                        decision: isApproved ? 'APPROVED' : 'REJECTED',
                        requestId,
                        processed: true
                      });
                    } catch (error) {
                      console.error('Error processing approval:', error);
                      emails.push({
                        from,
                        subject,
                        decision: isApproved ? 'APPROVED' : 'REJECTED',
                        requestId,
                        processed: false,
                        error: error
                      });
                    }
                  }
                }
              });
            });
          });

          fetch.once('end', () => {
            imap.end();
            resolve(emails);
          });
        });
      });
    });

    imap.once('error', (err: Error) => {
      reject(err);
    });

    imap.connect();
  });
};

async function processEmailApproval(requestId: string, decision: 'APPROVED' | 'REJECTED') {
  // Find the allocation request
  const allocationRequest = await HardwareAllocationRequest.findOne({
    _id: requestId,
    status: 'PENDING',
  });

  if (!allocationRequest) {
    throw new Error('Request not found or already processed');
  }

  const companyId = allocationRequest.companyId;

  // Update request status
  allocationRequest.status = decision;
  allocationRequest.processedAt = new Date();
  await allocationRequest.save();

  if (decision === 'APPROVED') {
    // Create the actual allocation
    const allocation = new HardwareAllocation({
      companyId: allocationRequest.companyId,
      userId: allocationRequest.userId,
      hardwareAssetId: allocationRequest.hardwareAssetId,
      remarks: allocationRequest.remarks,
      createdBy: allocationRequest.companyId,
    });

    await allocation.save();

    // Update asset status
    await HardwareAsset.findByIdAndUpdate(allocationRequest.hardwareAssetId, {
      status: 'ASSIGNED',
      updatedBy: allocationRequest.companyId,
    });

    // Populate for logging and email
    await allocation.populate([
      { path: 'userId', select: 'username email' },
      { path: 'hardwareAssetId', select: 'assetName brand assetModel serialNumber' },
      { path: 'createdBy', select: 'companyName' }
    ]);

    const hardwareAssetIdForLog = allocation.hardwareAssetId || (allocation as any).hardwareAssetId;

    // Create mock request for logging
    const mockReq = {
      user: { id: String(companyId), role: 'company_super_admin' },
      ip: '127.0.0.1',
      headers: {}
    } as any;

    await logAllocationCreate('hardware', String(allocation._id), {
      userId: String(allocation.userId),
      userName: (allocation.userId as any)?.username || 'Unknown',
      userEmail: (allocation.userId as any)?.email || '',
      hardwareAssetId: hardwareAssetIdForLog,
      assetName: (allocation.hardwareAssetId as any)?.assetName || 'Unknown Asset',
      allocatedDate: allocation.assignedDate,
      remarks: allocation.remarks,
    }, mockReq);

    // Send confirmation email to infra team
    const company = await Company.findById(companyId);
    if (company && company.emailConfig) {
      try {
        await processAllocationApproval(
          {
            userName: (allocation.userId as any)?.username || 'Unknown',
            userEmail: (allocation.userId as any)?.email || '',
            assetName: (allocation.hardwareAssetId as any)?.assetName || 'Unknown Asset',
            assetBrand: (allocation.hardwareAssetId as any)?.brand || '',
            assetModel: (allocation.hardwareAssetId as any)?.assetModel || '',
            serialNumber: (allocation.hardwareAssetId as any)?.serialNumber || '',
          },
          company.emailConfig
        );
      } catch (emailError) {
        console.error('Failed to send confirmation email:', emailError);
      }
    }
  }
}
