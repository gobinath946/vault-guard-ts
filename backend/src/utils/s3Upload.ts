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
    const fileName = `attachments/${uuidv4()}.${fileExtension}`;

    // Upload to S3
    const command = new PutObjectCommand({
      Bucket: BUCKET_NAME,
      Key: fileName,
      Body: file,
      ContentType: mimeType,
      ACL: 'public-read', // Make file publicly accessible
    });

    await s3Client.send(command);

    // Construct file URL
    const fileUrl = `${S3_BASE_URL}/${fileName}`;

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
 * Delete file from S3
 * @param fileName - File name/key in S3
 */
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
