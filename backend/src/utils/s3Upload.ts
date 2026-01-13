import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { v4 as uuidv4 } from 'uuid';

// S3 Configuration from environment variables
const s3Client = new S3Client({
  region: process.env.AWS_REGION || 'us-east-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
  },
});

const BUCKET_NAME = process.env.AWS_S3_BUCKET_NAME || '';
const S3_BASE_URL = process.env.AWS_S3_BASE_URL || '';

export interface UploadResult {
  fileUrl: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
}

/**
 * Upload file to S3
 * @param file - File buffer
 * @param originalName - Original file name
 * @param mimeType - File MIME type
 * @returns Upload result with file URL
 */
export const uploadToS3 = async (
  file: Buffer,
  originalName: string,
  mimeType: string
): Promise<UploadResult> => {
  try {
    // Generate unique file name
    const fileExtension = originalName.split('.').pop();
    const fileName = `checkout-attachments/${uuidv4()}.${fileExtension}`;

    // Upload to S3
    const command = new PutObjectCommand({
      Bucket: BUCKET_NAME,
      Key: fileName,
      Body: file,
      ContentType: mimeType,
      // Note: ACL removed - bucket should use bucket policy for public access
    });

    await s3Client.send(command);

    // Construct file URL (remove trailing slash from base URL if present)
    const baseUrl = S3_BASE_URL.endsWith('/') ? S3_BASE_URL.slice(0, -1) : S3_BASE_URL;
    const fileUrl = `${baseUrl}/${fileName}`;

    return {
      fileUrl,
      fileName,
      fileSize: file.length,
      mimeType,
    };
  } catch (error: any) {
    console.error('S3 Upload Error:', error);
    throw new Error(`Failed to upload file to S3: ${error.message}`);
  }
};

/**
 * Upload PDF file to S3 (specific for checkout reports)
 * @param file - File buffer
 * @param originalName - Original file name
 * @param checkoutId - Checkout process ID for organized storage
 * @returns Upload result with file URL
 */
export const uploadPDFToS3 = async (
  file: Buffer,
  originalName: string,
  checkoutId: string
): Promise<UploadResult> => {
  try {
    // Generate unique file name for PDF reports
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const fileName = `checkout-reports/${checkoutId}/${timestamp}-${originalName}`;

    // Upload to S3
    const command = new PutObjectCommand({
      Bucket: BUCKET_NAME,
      Key: fileName,
      Body: file,
      ContentType: 'application/pdf',
      // Add metadata for better organization
      Metadata: {
        'checkout-id': checkoutId,
        'generated-at': new Date().toISOString(),
        'file-type': 'checkout-report'
      }
    });

    await s3Client.send(command);

    // Construct file URL
    const baseUrl = S3_BASE_URL.endsWith('/') ? S3_BASE_URL.slice(0, -1) : S3_BASE_URL;
    const fileUrl = `${baseUrl}/${fileName}`;

    return {
      fileUrl,
      fileName,
      fileSize: file.length,
      mimeType: 'application/pdf',
    };
  } catch (error: any) {
    console.error('S3 PDF Upload Error:', error);
    throw new Error(`Failed to upload PDF to S3: ${error.message}`);
  }
};
export const deleteFromS3 = async (fileName: string): Promise<void> => {
  try {
    const command = new DeleteObjectCommand({
      Bucket: BUCKET_NAME,
      Key: fileName,
    });

    await s3Client.send(command);
  } catch (error: any) {
    console.error('S3 Delete Error:', error);
    throw new Error(`Failed to delete file from S3: ${error.message}`);
  }
};

/**
 * Validate file type (images and videos only)
 * @param mimeType - File MIME type
 * @returns true if valid, false otherwise
 */
export const isValidFileType = (mimeType: string): boolean => {
  const allowedTypes = [
    // Images
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/gif',
    'image/webp',
    'image/svg+xml',
    // Videos
    'video/mp4',
    'video/mpeg',
    'video/quicktime',
    'video/x-msvideo',
    'video/webm',
    // Documents
    'application/pdf',
  ];

  return allowedTypes.includes(mimeType);
};

/**
 * Validate file size (max 50MB)
 * @param fileSize - File size in bytes
 * @returns true if valid, false otherwise
 */
export const isValidFileSize = (fileSize: number): boolean => {
  const maxSize = 50 * 1024 * 1024; // 50MB
  return fileSize <= maxSize;
};
/**
 * Clean up old PDF files from S3 (for maintenance)
 * @param olderThanDays - Delete PDFs older than this many days
 */
export const cleanupOldPDFs = async (olderThanDays: number = 90): Promise<void> => {
  try {
    // This would require listing objects and checking their creation dates
    // Implementation depends on your cleanup requirements
    console.log(`Cleanup function available for PDFs older than ${olderThanDays} days`);
    // TODO: Implement S3 ListObjects and DeleteObjects for cleanup
  } catch (error: any) {
    console.error('S3 PDF Cleanup Error:', error);
    throw new Error(`Failed to cleanup old PDFs: ${error.message}`);
  }
};