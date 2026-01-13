import { Response } from 'express';
import mongoose from 'mongoose';
import path from 'path';
import fs from 'fs';
import { AuthRequest } from '../middleware/auth';
import CheckoutProcess from '../models/CheckoutProcess';
import User from '../models/User';
import HardwareAllocation from '../models/HardwareAllocation';
import SoftwareAllocation from '../models/SoftwareAllocation';
import Company from '../models/Company';

// Helper function to clean up uploaded files
const cleanupUploadedFiles = async (checkout: any) => {
    try {
        // Clean up HR confirmation file if it exists and is stored on server
        const hrStep = checkout.steps.find((s: any) => s.stepIndex === 1);
        if (hrStep?.data?.fileUrl && hrStep.data.storage === 'server' && hrStep.data.serverPath) {
            if (fs.existsSync(hrStep.data.serverPath)) {
                fs.unlinkSync(hrStep.data.serverPath);

            }
        }
    } catch (error) {
        console.error('Error cleaning up uploaded files:', error);
        // Don't throw error as this is cleanup - log and continue
    }
};

export const initiateCheckout = async (req: AuthRequest, res: Response) => {
    try {
        const { userId } = req.body;
        const { id: companyId, role } = req.user!;

        if (role !== 'company_super_admin') {
            return res.status(403).json({ message: 'Access denied. Super Admin only.' });
        }

        const user = await User.findOne({ _id: userId, companyId });
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        // Check if there's an existing incomplete checkout
        const existingCheckout = await CheckoutProcess.findOne({
            userId,
            companyId,
            status: { $ne: 'Completed' }
        });

        if (existingCheckout) {
            // Ensure status is correctly set for existing initiated checkouts
            if (existingCheckout.status === 'Initiated' || !existingCheckout.status) {
                // If it was already in progress (old logic), keep it that way
                // only if some steps are actually done.
                const hasCompletedSteps = existingCheckout.steps.some((s: any) => s.status === 'Completed');
                if (!hasCompletedSteps) {
                    existingCheckout.status = 'Initiated';
                    await existingCheckout.save();
                }
            }
            return res.status(200).json(existingCheckout);
        }

        const steps = [
            { stepIndex: 1, title: 'HR Relieving Confirmation', status: 'Pending' },
            { stepIndex: 2, title: 'Disable Official Email Account', status: 'Pending' },
            { stepIndex: 3, title: 'Revoke VPN Access', status: 'Pending' },
            { stepIndex: 4, title: 'Remove Application Access', status: 'Pending' },
            { stepIndex: 5, title: 'Revoke Database & Server Access', status: 'Pending' },
            { stepIndex: 6, title: 'Disable Biometric Access', status: 'Pending' },
            { stepIndex: 7, title: 'Asset & Access Verification', status: 'Pending' },
            { stepIndex: 8, title: 'Final Review & Validation', status: 'Pending' },
            { stepIndex: 9, title: 'Email Report & Confirmation', status: 'Pending' },
        ];

        const checkout = new CheckoutProcess({
            companyId,
            userId,
            steps,
        });

        await checkout.save();

        // Lock user but with 'Initiated' status
        await User.findByIdAndUpdate(userId, {
            isCheckoutStarted: true,
            checkoutStatus: 'Initiated'
        });

        res.status(201).json(checkout);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

export const getCheckoutList = async (req: AuthRequest, res: Response) => {
    try {
        const { id: companyId, role } = req.user!;
        if (role !== 'company_super_admin') {
            return res.status(403).json({ message: 'Access denied. Super Admin only.' });
        }

        // Extract query parameters for filtering and searching
        const page = parseInt((req.query.page as string) || '1', 10);
        const limit = parseInt((req.query.limit as string) || '10', 10);
        const q = (req.query.q as string) || '';
        const status = req.query.status as string;

        // Build the base query
        const query: any = {
            companyId,
            status: { $in: ['In Progress', 'Completed', 'Failed'] }
        };

        // Add status filter if provided
        if (status && status !== 'ALL') {
            query.status = status;
        }

        // Get total count for pagination
        let total = 0;
        let checkouts = [];

        if (q) {
            // If search query is provided, we need to populate first then filter
            const allCheckouts = await CheckoutProcess.find(query)
                .populate('userId', 'username email emailStatus isActive')
                .sort({ createdAt: -1 });

            // Filter by search query on populated user data
            const filteredCheckouts = allCheckouts.filter((checkout: any) => {
                const user = checkout.userId;
                if (!user) return false;

                const searchLower = q.toLowerCase();
                return (
                    user.username?.toLowerCase().includes(searchLower) ||
                    user.email?.toLowerCase().includes(searchLower)
                );
            });

            total = filteredCheckouts.length;

            // Apply pagination to filtered results
            const startIndex = (page - 1) * limit;
            checkouts = filteredCheckouts.slice(startIndex, startIndex + limit);
        } else {
            // No search query, use database pagination
            total = await CheckoutProcess.countDocuments(query);
            checkouts = await CheckoutProcess.find(query)
                .populate('userId', 'username email emailStatus isActive')
                .skip((page - 1) * limit)
                .limit(limit)
                .sort({ createdAt: -1 });
        }

        res.json({
            checkouts,
            total,
            page,
            totalPages: Math.ceil(total / limit),
            hasNextPage: page < Math.ceil(total / limit),
            hasPrevPage: page > 1,
        });
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

export const getCheckoutDetails = async (req: AuthRequest, res: Response) => {
    try {
        const { checkoutId } = req.params;
        const { id: companyId } = req.user!;

        const checkout = await CheckoutProcess.findOne({ _id: checkoutId, companyId })
            .populate('userId', 'username email emailStatus isActive');

        if (!checkout) {
            return res.status(404).json({ message: 'Checkout process not found' });
        }

        // Add back-compatibility for Step 9 if it doesn't exist
        const hasStep9 = checkout.steps.some((s: any) => s.stepIndex === 9);
        if (!hasStep9 && checkout.status !== 'Completed') {
            checkout.steps.push({
                stepIndex: 9,
                title: 'Email Report & Confirmation',
                status: 'Pending'
            });
            // Also ensure Step 8 title is updated
            const step8 = checkout.steps.find((s: any) => s.stepIndex === 8);
            if (step8) step8.title = 'Final Review & Validation';

            await checkout.save();
        }

        // If step 7, fetch allocated assets
        const hardwareAssets = await HardwareAllocation.find({
            userId: checkout.userId,
            status: 'ACTIVE',
            isDeleted: false
        }).populate('hardwareAssetId');

        const softwareAssets = await SoftwareAllocation.find({
            userId: checkout.userId,
            status: 'ACTIVE',
            isDeleted: false
        }).populate('softwareAssetId');

        res.json({
            checkout: {
                ...checkout.toObject(),
                status: checkout.status || 'Initiated',
                currentStep: checkout.currentStep || 1,
                steps: checkout.steps || []
            },
            assets: {
                hardware: hardwareAssets,
                software: softwareAssets
            }
        });
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

export const updateCheckoutStep = async (req: AuthRequest, res: Response) => {
    try {
        const { checkoutId } = req.params;
        const { stepIndex, status, data } = req.body;
        const { id: companyId } = req.user!;

        const checkout = await CheckoutProcess.findOne({ _id: checkoutId, companyId });
        if (!checkout) {
            return res.status(404).json({ message: 'Checkout process not found' });
        }

        const step = checkout.steps.find((s: any) => s.stepIndex === stepIndex);
        if (!step) {
            return res.status(404).json({ message: 'Step not found' });
        }

        step.status = status;
        step.data = data;
        step.completedBy = new mongoose.Types.ObjectId(String(companyId));
        step.completedAt = new Date();

        // If step 2 (Email) is completed, update user email status
        if (stepIndex === 2 && status === 'Completed') {
            await User.findByIdAndUpdate(checkout.userId, {
                emailStatus: 'Inactive',
                isActive: false // Also deactivating user login
            });
        }

        // NEW: If Step 1 (HR Confirmation) is completed, change process status to 'In Progress'
        // Only change status if it's not already completed
        if (Number(stepIndex) === 1 && status === 'Completed' && checkout.status !== 'Completed') {
            checkout.status = 'In Progress';
            await User.findByIdAndUpdate(checkout.userId, {
                checkoutStatus: 'In Progress',
                isCheckoutStarted: true
            });
        }

        // Update current step if this one is completed and checkout is not already completed


        if (status === 'Completed' && checkout.currentStep === stepIndex && checkout.status !== 'Completed') {
            const newCurrentStep = Math.min(stepIndex + 1, 9);

            checkout.currentStep = newCurrentStep;
        }

        await checkout.save();

        // Populate userId before returning so frontend has immediate access to user details
        await checkout.populate('userId', 'username email emailStatus isActive');

        res.json(checkout);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

export const proceedCheckout = async (req: AuthRequest, res: Response) => {
    try {
        const { checkoutId } = req.params;
        const { emailConfig } = req.body;
        const { id: adminId, companyId, email: adminEmail, role: adminRole } = req.user!;
        const adminName = adminEmail.split('@')[0];

        // Fetch company config for S3 and Email
        const company = await Company.findById(companyId).select('s3Config emailConfig');
        if (!company) {
            return res.status(404).json({ message: 'Company not found' });
        }

        const checkout = await CheckoutProcess.findOne({ _id: checkoutId, companyId })
            .populate('userId');

        if (!checkout) {
            return res.status(404).json({ message: 'Checkout process not found' });
        }

        // Allow updates to completed checkouts for editing purposes
        // if (checkout.status === 'Completed') {
        //     return res.status(400).json({ message: 'Checkout already completed' });
        // }

        // Validate all steps (1-8) are completed before allowing Step 9 (Proceed)
        const incompleteSteps = checkout.steps.filter((s: any) => s.status !== 'Completed' && s.stepIndex < 9);
        if (incompleteSteps.length > 0) {
            return res.status(400).json({
                message: 'All steps must be completed before proceeding',
                incompleteSteps: incompleteSteps.map(s => s.title)
            });
        }

        // 1. Fetch data for PDF/Report - Include ALL assets ever allocated to this user
        // Use (checkout.userId as any)._id because userId is populated
        const userId = (checkout.userId as any)._id;

        const hardwareAssets = await HardwareAllocation.find({
            userId: userId
        }).populate('hardwareAssetId');

        const softwareAssets = await SoftwareAllocation.find({
            userId: userId
        }).populate('softwareAssetId');

        // NEW: "Active-at-Initiation" Filtering Logic
        // We only want to show assets that were in the user's possession when the process started, 
        // or items they returned/revoked DURING the offboarding process.
        const initiationDate = new Date(checkout.createdAt);

        const filteredHardware = hardwareAssets.filter((alloc: any) => {
            // Include if currently ACTIVE
            if (alloc.status === 'ACTIVE') return true;
            // Include if RETURNED/DELETED but the return happened AFTER initiation
            if ((alloc.status === 'RETURNED' || alloc.status === 'DELETED') &&
                alloc.returnedDate && new Date(alloc.returnedDate) > initiationDate) {
                return true;
            }
            return false;
        });

        const filteredSoftware = softwareAssets.filter((alloc: any) => {
            // Include if currently ACTIVE
            if (alloc.status === 'ACTIVE') return true;
            // Include if EXPIRED/DELETED but the revocation happened AFTER initiation
            // Software uses updatedAt as the revocation timestamp
            if ((alloc.status === 'EXPIRED' || alloc.status === 'DELETED') &&
                alloc.updatedAt && new Date(alloc.updatedAt) > initiationDate) {
                return true;
            }
            return false;
        });

        // 2. Generate PDF using filtered assets and upload to S3
        const { generateCheckoutPDF } = await import('../utils/reportGenerator');
        const pdfBuffer = await generateCheckoutPDF(checkout, checkout.userId, {
            hardware: filteredHardware,
            software: filteredSoftware
        });

        // Upload PDF to S3
        const { uploadPDFToS3 } = await import('../utils/s3Upload');
        const username = (checkout.userId as any)?.username || 'Employee';
        const fileName = `Checkout_Report_${username}_${Date.now()}.pdf`;

        const uploadResult = await uploadPDFToS3(pdfBuffer, fileName, checkoutId, company.s3Config);
        const pdfS3Url = uploadResult.fileUrl;

        // 3. Send Email
        const { sendOffboardingReport } = await import('../utils/emailService');
        const emailResult = await sendOffboardingReport(checkout.userId, pdfS3Url, emailConfig, company.emailConfig);

        if (!emailResult.success) {
            return res.status(500).json({
                message: 'Failed to send offboarding report email. Completion blocked.',
                error: emailResult.error
            });
        }

        // 4. Update Checkout Record
        checkout.status = 'Completed';
        checkout.pdfPath = pdfS3Url; // Keep for backward compatibility
        checkout.pdfS3Url = pdfS3Url;
        checkout.pdfS3Key = uploadResult.fileName;
        checkout.pdfGeneratedAt = new Date();
        checkout.reportEmailSent = emailResult.success;

        // Mark Step 9 as completed
        const step9 = checkout.steps.find((s: any) => s.stepIndex === 9);
        if (step9) {
            step9.status = 'Completed';
            step9.completedAt = new Date();
            step9.completedBy = new mongoose.Types.ObjectId(String(companyId));
            step9.data = emailConfig;
        }

        await checkout.save();

        // 4.1. Clean up temporary uploaded files
        await cleanupUploadedFiles(checkout);

        // 5. Update User Final State
        await User.findByIdAndUpdate(checkout.userId, {
            checkoutStatus: 'Completed',
            isActive: false,
            emailStatus: 'Inactive'
        });

        // 6. Log Audit Activity
        const AuditLog = (await import('../models/AuditLog')).default;
        await AuditLog.create({
            userId: adminId,
            userEmail: adminEmail,
            userName: adminName,
            userRole: adminRole,
            companyId,
            action: 'complete_offboarding',
            resourceType: 'checkout',
            resourceId: checkoutId,
            resourceName: (checkout.userId as any).username,
            ipAddress: req.ip || 'unknown',
            timestamp: new Date(),
        });

        res.json({
            message: 'Checkout completed successfully',
            checkout,
            emailSent: true,
            pdfGenerated: true,
            pdfPath: pdfS3Url
        });
    } catch (error: any) {
        console.error('Proceed Checkout Error:', error);
        res.status(500).json({ message: error.message });
    }
};

export const resendOffboardingMail = async (req: AuthRequest, res: Response) => {
    try {
        const { checkoutId } = req.params;
        const { emailConfig } = req.body;
        const { companyId } = req.user!;

        const checkout = await CheckoutProcess.findOne({ _id: checkoutId, companyId })
            .populate('userId');

        if (!checkout) {
            return res.status(404).json({ message: 'Checkout process not found' });
        }

        // Always regenerate PDF to ensure latest data/fixes are applied
        const userId = (checkout.userId as any)._id;

        const hardwareAssets = await HardwareAllocation.find({
            userId: userId
        }).populate('hardwareAssetId');

        const softwareAssets = await SoftwareAllocation.find({
            userId: userId
        }).populate('softwareAssetId');

        // FORCE RELOAD: Clear module cache
        try { delete require.cache[require.resolve('../utils/reportGenerator')]; } catch (e) { }

        // NEW: "Active-at-Initiation" Filtering Logic
        const initiationDate = new Date(checkout.createdAt);
        const filteredHardware = hardwareAssets.filter((alloc: any) => {
            if (alloc.status === 'ACTIVE') return true;
            if ((alloc.status === 'RETURNED' || alloc.status === 'DELETED') &&
                alloc.returnedDate && new Date(alloc.returnedDate) > initiationDate) {
                return true;
            }
            return false;
        });

        const filteredSoftware = softwareAssets.filter((alloc: any) => {
            if (alloc.status === 'ACTIVE') return true;
            if ((alloc.status === 'EXPIRED' || alloc.status === 'DELETED') &&
                alloc.updatedAt && new Date(alloc.updatedAt) > initiationDate) {
                return true;
            }
            return false;
        });

        const { generateCheckoutPDF } = await import('../utils/reportGenerator');
        const pdfBuffer = await generateCheckoutPDF(checkout, checkout.userId, {
            hardware: filteredHardware,
            software: filteredSoftware
        });

        // Upload new PDF to S3
        // Fetch company config
        const company = await Company.findById(companyId).select('s3Config emailConfig');
        if (!company) {
            return res.status(404).json({ message: 'Company not found' });
        }

        const { uploadPDFToS3 } = await import('../utils/s3Upload');
        const username = (checkout.userId as any)?.username || 'Employee';
        const fileName = `Checkout_Report_${username}_${Date.now()}.pdf`;

        const uploadResult = await uploadPDFToS3(pdfBuffer, fileName, checkoutId, company.s3Config);

        // Update checkout with new S3 URL
        checkout.pdfPath = uploadResult.fileUrl; // Keep for backward compatibility
        checkout.pdfS3Url = uploadResult.fileUrl;
        checkout.pdfS3Key = uploadResult.fileName;
        checkout.pdfGeneratedAt = new Date();
        await checkout.save();

        const { sendOffboardingReport } = await import('../utils/emailService');
        const emailResult = await sendOffboardingReport(checkout.userId, uploadResult.fileUrl, emailConfig, company.emailConfig);

        if (!emailResult.success) {
            return res.status(500).json({
                message: 'Failed to resend offboarding report email.',
                error: emailResult.error
            });
        }

        res.json({
            message: 'Offboarding report email resent successfully',
            emailSent: true
        });
    } catch (error: any) {
        console.error('Resend Mail Error:', error);
        res.status(500).json({ message: error.message });
    }
};

export const generatePreviewPDF = async (req: AuthRequest, res: Response) => {
    try {
        const { checkoutId } = req.params;
        const { id: companyId } = req.user!;

        const checkout = await CheckoutProcess.findOne({ _id: checkoutId, companyId })
            .populate('userId');

        if (!checkout) {
            return res.status(404).json({ message: 'Checkout process not found' });
        }

        // Check if PDF already exists and is recent (within last hour to allow for updates)
        if (checkout.pdfS3Url && checkout.pdfGeneratedAt) {
            const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
            if (checkout.pdfGeneratedAt > oneHourAgo) {
                return res.json({
                    pdfPath: checkout.pdfS3Url,
                    message: 'PDF retrieved from storage',
                    cached: true
                });
            }
        }

        // Fetch data for PDF/Report - Include ALL assets ever allocated to this user
        const userId = (checkout.userId as any)._id;

        const hardwareAssets = await HardwareAllocation.find({
            userId: userId
        }).populate('hardwareAssetId');

        const softwareAssets = await SoftwareAllocation.find({
            userId: userId
        }).populate('softwareAssetId');

        // Generate PDF (preview, doesn't mark as completed)
        // NEW: "Active-at-Initiation" Filtering Logic
        const initiationDate = new Date(checkout.createdAt);
        const filteredHardware = hardwareAssets.filter((alloc: any) => {
            if (alloc.status === 'ACTIVE') return true;
            if ((alloc.status === 'RETURNED' || alloc.status === 'DELETED') &&
                alloc.returnedDate && new Date(alloc.returnedDate) > initiationDate) {
                return true;
            }
            return false;
        });

        const filteredSoftware = softwareAssets.filter((alloc: any) => {
            if (alloc.status === 'ACTIVE') return true;
            if ((alloc.status === 'EXPIRED' || alloc.status === 'DELETED') &&
                alloc.updatedAt && new Date(alloc.updatedAt) > initiationDate) {
                return true;
            }
            return false;
        });

        const { generateCheckoutPDF } = await import('../utils/reportGenerator');
        const pdfBuffer = await generateCheckoutPDF(checkout, checkout.userId, {
            hardware: filteredHardware,
            software: filteredSoftware
        });

        // Fetch company config
        const company = await Company.findById(companyId).select('s3Config');
        if (!company) {
            return res.status(404).json({ message: 'Company not found' });
        }

        // Upload PDF to S3
        const { uploadPDFToS3 } = await import('../utils/s3Upload');
        const username = (checkout.userId as any)?.username || 'Employee';
        const fileName = `Checkout_Report_${username}_${Date.now()}.pdf`;

        const uploadResult = await uploadPDFToS3(pdfBuffer, fileName, checkoutId, company.s3Config);

        // Update checkout with S3 URL and metadata
        await CheckoutProcess.findByIdAndUpdate(checkoutId, {
            pdfS3Url: uploadResult.fileUrl,
            pdfS3Key: uploadResult.fileName,
            pdfGeneratedAt: new Date(),
            // Keep legacy pdfPath for backward compatibility
            pdfPath: uploadResult.fileUrl
        });

        res.json({
            pdfPath: uploadResult.fileUrl,
            message: 'PDF generated and uploaded successfully',
            cached: false
        });
    } catch (error: any) {
        console.error('Generate Preview PDF Error:', error);
        res.status(500).json({ message: error.message });
    }
};

export const uploadCheckoutDocument = async (req: AuthRequest, res: Response) => {
    try {
        if (!req.file) {
            return res.status(400).json({ message: 'No file uploaded' });
        }

        // Validate file type
        const allowedMimeTypes = [
            'application/pdf',
            'image/png',
            'image/jpeg',
            'image/jpg'
        ];

        if (!allowedMimeTypes.includes(req.file.mimetype)) {
            return res.status(400).json({
                message: 'Invalid file type. Only PDF, PNG, and JPEG files are allowed.'
            });
        }

        // Validate file size (10MB limit)
        const maxSize = 10 * 1024 * 1024; // 10MB
        if (req.file.buffer.length > maxSize) {
            return res.status(400).json({
                message: 'File too large. Maximum size is 10MB.'
            });
        }

        // Fetch company config
        const company = await Company.findById(req.user!.id).select('s3Config');
        if (!company) {
            return res.status(404).json({ message: 'Company not found' });
        }

        // Upload to S3
        const { uploadToS3 } = await import('../utils/s3Upload');
        const uploadResult = await uploadToS3(
            req.file.buffer,
            req.file.originalname,
            req.file.mimetype,
            company.s3Config
        );

        res.json({
            fileUrl: uploadResult.fileUrl,
            fileName: req.file.originalname,
            fileSize: uploadResult.fileSize,
            mimeType: uploadResult.mimeType,
            storage: 's3',
            uploadedAt: new Date().toISOString()
        });
    } catch (error: any) {
        console.error('File upload error:', error);
        res.status(500).json({ message: 'File upload failed: ' + error.message });
    }
};

// New endpoint for uploading step-specific attachments
export const uploadStepAttachment = async (req: AuthRequest, res: Response) => {
    try {
        const { checkoutId, stepIndex } = req.params;
        const { id: companyId } = req.user!;

        if (!req.file) {
            return res.status(400).json({ message: 'No file uploaded' });
        }

        // Validate file type
        const allowedMimeTypes = [
            'application/pdf',
            'image/png',
            'image/jpeg',
            'image/jpg'
        ];

        if (!allowedMimeTypes.includes(req.file.mimetype)) {
            return res.status(400).json({
                message: 'Invalid file type. Only PDF, PNG, and JPEG files are allowed.'
            });
        }

        // Validate file size (10MB limit)
        const maxSize = 10 * 1024 * 1024; // 10MB
        if (req.file.buffer.length > maxSize) {
            return res.status(400).json({
                message: 'File too large. Maximum size is 10MB.'
            });
        }

        // CRITICAL: Validate file content matches MIME type to prevent HTML uploads
        const fileHeader = req.file.buffer.toString('utf8', 0, Math.min(100, req.file.buffer.length));


        // Check for HTML content being uploaded as PDF
        if (req.file.mimetype === 'application/pdf') {
            if (!fileHeader.includes('%PDF')) {

                if (fileHeader.includes('<html') || fileHeader.includes('<!DOCTYPE')) {

                    return res.status(400).json({
                        message: 'Invalid PDF file. The uploaded file appears to be HTML content instead of a PDF document. Please ensure you are uploading a valid PDF file.'
                    });
                }
                return res.status(400).json({
                    message: 'Invalid PDF file. The uploaded file does not have a valid PDF header.'
                });
            }

        }

        // Check for HTML content being uploaded as image
        if (req.file.mimetype.startsWith('image/')) {
            if (fileHeader.includes('<html') || fileHeader.includes('<!DOCTYPE')) {

                return res.status(400).json({
                    message: 'Invalid image file. The uploaded file appears to be HTML content instead of an image. Please ensure you are uploading a valid image file.'
                });
            }
        }

        // Find checkout process
        const checkout = await CheckoutProcess.findOne({ _id: checkoutId, companyId });
        if (!checkout) {
            return res.status(404).json({ message: 'Checkout process not found' });
        }

        // Find the step
        const step = checkout.steps.find((s: any) => s.stepIndex === parseInt(stepIndex));
        if (!step) {
            return res.status(404).json({ message: 'Step not found' });
        }

        // Fetch company config
        const company = await Company.findById(companyId).select('s3Config');
        if (!company) {
            return res.status(404).json({ message: 'Company not found' });
        }

        // Upload to S3
        const { uploadToS3 } = await import('../utils/s3Upload');
        const uploadResult = await uploadToS3(
            req.file.buffer,
            req.file.originalname,
            req.file.mimetype,
            company.s3Config
        );

        // Update step with attachment info
        step.attachment = {
            fileUrl: uploadResult.fileUrl,
            fileName: req.file.originalname,
            fileSize: uploadResult.fileSize,
            mimeType: uploadResult.mimeType,
            s3Key: uploadResult.fileName, // S3 key for file management
            uploadedAt: new Date()
        };

        await checkout.save();



        res.json({
            fileUrl: uploadResult.fileUrl,
            fileName: req.file.originalname,
            fileSize: uploadResult.fileSize,
            mimeType: uploadResult.mimeType,
            s3Key: uploadResult.fileName,
            storage: 's3',
            uploadedAt: new Date().toISOString()
        });
    } catch (error: any) {
        console.error('Step attachment upload error:', error);
        res.status(500).json({ message: 'Attachment upload failed: ' + error.message });
    }
};

// Serve attachment file from S3 through backend proxy
export const serveAttachmentFile = async (req: AuthRequest, res: Response) => {
    try {
        const { checkoutId, stepIndex } = req.params;
        const { id: companyId } = req.user!;



        // Find checkout process
        const checkout = await CheckoutProcess.findOne({ _id: checkoutId, companyId });
        if (!checkout) {

            return res.status(404).json({ message: 'Checkout process not found' });
        }

        // Find the step
        const step = checkout.steps.find((s: any) => s.stepIndex === parseInt(stepIndex));
        if (!step || !step.attachment) {

            return res.status(404).json({ message: 'Attachment not found' });
        }

        const attachment = step.attachment;


        // If it's an S3 file, proxy it
        if (attachment.s3Key) {
            try {
                // Import S3 client
                const { S3Client, GetObjectCommand } = await import('@aws-sdk/client-s3');

                const s3Client = new S3Client({
                    region: process.env.AWS_REGION || 'us-east-1',
                    credentials: {
                        accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
                        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
                    },
                });



                const command = new GetObjectCommand({
                    Bucket: process.env.AWS_S3_BUCKET_NAME || '',
                    Key: attachment.s3Key,
                });

                const s3Response = await s3Client.send(command);



                // Verify content type
                if (s3Response.ContentType && !s3Response.ContentType.includes(attachment.mimeType.split('/')[0])) {
                    console.warn(`⚠️ Content type mismatch: expected ${attachment.mimeType}, got ${s3Response.ContentType}`);
                }

                // Set appropriate headers
                res.setHeader('Content-Type', s3Response.ContentType || attachment.mimeType);
                res.setHeader('Content-Disposition', `inline; filename="${attachment.fileName}"`);
                res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
                res.setHeader('Pragma', 'no-cache');
                res.setHeader('Expires', '0');
                res.setHeader('Content-Length', s3Response.ContentLength?.toString() || '0');



                // Stream the file
                if (s3Response.Body) {
                    const stream = s3Response.Body as any;

                    // Handle stream errors
                    stream.on('error', (streamError: any) => {
                        console.error('❌ Stream error:', streamError);
                        if (!res.headersSent) {
                            res.status(500).json({ message: 'Stream error occurred' });
                        }
                    });

                    // Handle stream end
                    stream.on('end', () => {

                    });

                    // Debug: Read first few bytes of the stream to verify content
                    let firstChunk = true;
                    stream.on('data', (chunk: any) => {
                        if (firstChunk) {
                            const preview = chunk.toString('utf8', 0, Math.min(100, chunk.length));

                            firstChunk = false;
                        }
                    });


                    stream.pipe(res);
                } else {

                    return res.status(404).json({ message: 'File content not found' });
                }
            } catch (s3Error: any) {
                console.error('❌ S3 file retrieval error:', s3Error);
                console.error('❌ S3 Error details:', {
                    code: s3Error.Code,
                    message: s3Error.message,
                    statusCode: s3Error.$metadata?.httpStatusCode,
                    requestId: s3Error.$metadata?.requestId
                });

                // Return JSON error instead of letting it fall through to HTML error page
                return res.status(500).json({
                    message: 'Failed to retrieve file from storage',
                    error: s3Error.message,
                    code: s3Error.Code
                });
            }
        } else {

            // Fallback: redirect to original URL
            return res.redirect(attachment.fileUrl);
        }
    } catch (error: any) {
        console.error('❌ Serve attachment error:', error);
        res.status(500).json({ message: 'Failed to serve attachment: ' + error.message });
    }
};

// Debug endpoint to check attachment data
export const debugAttachment = async (req: AuthRequest, res: Response) => {
    try {
        const { checkoutId, stepIndex } = req.params;
        const { id: companyId } = req.user!;



        // Find checkout process
        const checkout = await CheckoutProcess.findOne({ _id: checkoutId, companyId });
        if (!checkout) {
            return res.status(404).json({ message: 'Checkout process not found' });
        }

        // Find the step
        const step = checkout.steps.find((s: any) => s.stepIndex === parseInt(stepIndex));
        if (!step) {
            return res.status(404).json({
                message: 'Step not found',
                availableSteps: checkout.steps.map((s: any) => ({ stepIndex: s.stepIndex, hasAttachment: !!s.attachment }))
            });
        }

        // Return attachment debug info
        res.json({
            stepIndex: step.stepIndex,
            hasAttachment: !!step.attachment,
            attachment: step.attachment ? {
                fileName: step.attachment.fileName,
                fileSize: step.attachment.fileSize,
                mimeType: step.attachment.mimeType,
                s3Key: step.attachment.s3Key,
                fileUrl: step.attachment.fileUrl,
                uploadedAt: step.attachment.uploadedAt
            } : null
        });
    } catch (error: any) {
        console.error('❌ Debug attachment error:', error);
        res.status(500).json({ message: 'Failed to debug attachment: ' + error.message });
    }
};
// Delete step attachment
export const deleteStepAttachment = async (req: AuthRequest, res: Response) => {
    try {
        const { checkoutId, stepIndex } = req.params;
        const { id: companyId } = req.user!;

        // Find checkout process
        const checkout = await CheckoutProcess.findOne({ _id: checkoutId, companyId });
        if (!checkout) {
            return res.status(404).json({ message: 'Checkout process not found' });
        }

        // Find the step
        const step = checkout.steps.find((s: any) => s.stepIndex === parseInt(stepIndex));
        if (!step || !step.attachment) {
            return res.status(404).json({ message: 'Attachment not found' });
        }

        // Delete from S3 if it exists
        if (step.attachment.s3Key) {
            try {
                const { deleteFromS3 } = await import('../utils/s3Upload');
                await deleteFromS3(step.attachment.s3Key);

            } catch (s3Error) {
                console.warn('Failed to delete from S3:', s3Error);
                // Continue with database cleanup even if S3 deletion fails
            }
        }

        // Remove attachment from step
        step.attachment = undefined;
        await checkout.save();



        res.json({ message: 'Attachment deleted successfully' });
    } catch (error: any) {
        console.error('Delete attachment error:', error);
        res.status(500).json({ message: 'Failed to delete attachment: ' + error.message });
    }
};

// Test endpoint to directly fetch from S3 and return first 200 bytes as text
export const testS3File = async (req: AuthRequest, res: Response) => {
    try {
        const { checkoutId, stepIndex } = req.params;
        const { id: companyId } = req.user!;

        // Find checkout and attachment (same as serveAttachmentFile)
        const checkout = await CheckoutProcess.findOne({ _id: checkoutId, companyId });
        if (!checkout) {
            return res.status(404).json({ message: 'Checkout process not found' });
        }

        const step = checkout.steps.find((s: any) => s.stepIndex === parseInt(stepIndex));
        if (!step || !step.attachment) {
            return res.status(404).json({ message: 'Attachment not found' });
        }

        const attachment = step.attachment;

        if (attachment.s3Key) {
            const { S3Client, GetObjectCommand } = await import('@aws-sdk/client-s3');

            const s3Client = new S3Client({
                region: process.env.AWS_REGION || 'us-east-1',
                credentials: {
                    accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
                    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
                },
            });

            const command = new GetObjectCommand({
                Bucket: process.env.AWS_S3_BUCKET_NAME || '',
                Key: attachment.s3Key,
            });

            const s3Response = await s3Client.send(command);

            if (s3Response.Body) {
                // Read the entire stream into a buffer
                const chunks: any[] = [];
                const stream = s3Response.Body as any;

                for await (const chunk of stream) {
                    chunks.push(chunk);
                }

                const buffer = Buffer.concat(chunks);
                const preview = buffer.toString('utf8', 0, Math.min(200, buffer.length));

                res.json({
                    fileName: attachment.fileName,
                    s3Key: attachment.s3Key,
                    contentType: s3Response.ContentType,
                    contentLength: s3Response.ContentLength,
                    actualSize: buffer.length,
                    preview: preview,
                    isPDF: preview.includes('%PDF'),
                    isHTML: preview.includes('<html') || preview.includes('<!DOCTYPE')
                });
            } else {
                res.status(404).json({ message: 'No content in S3 response' });
            }
        } else {
            res.status(400).json({ message: 'No S3 key found' });
        }
    } catch (error: any) {
        console.error('Test S3 file error:', error);
        res.status(500).json({ message: 'Test failed: ' + error.message });
    }
};