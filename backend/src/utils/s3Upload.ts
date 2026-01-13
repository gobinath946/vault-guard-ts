import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { v4 as uuidv4 } from 'uuid';

export interface S3Config {
  accessKey: string;
  secretKey: string;
  region: string;
  bucket: string;
  s3Url?: string;
}

// Function to get S3 Client dynamically
const getS3Client = (config?: S3Config) => {
  return new S3Client({
    region: config?.region || process.env.AWS_REGION || 'us-east-1',
    credentials: {
      accessKeyId: config?.accessKey || process.env.AWS_ACCESS_KEY_ID || '',
      secretAccessKey: config?.secretKey || process.env.AWS_SECRET_ACCESS_KEY || '',
    },
  });
};

export interface UploadResult {
  fileUrl: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
}

/**
 * Upload file to S3
 */
export const uploadToS3 = async (
  file: Buffer,
  originalName: string,
  mimeType: string,
  config?: S3Config
): Promise<UploadResult> => {
  try {
    const s3Client = getS3Client(config);
    const bucketName = config?.bucket || process.env.AWS_S3_BUCKET_NAME || '';
    const s3BaseUrl = config?.s3Url || process.env.AWS_S3_BASE_URL || '';

    // Generate unique file name
    const fileExtension = originalName.split('.').pop();
    const fileName = `checkout-attachments/${uuidv4()}.${fileExtension}`;

    // Upload to S3
    const command = new PutObjectCommand({
      Bucket: bucketName,
      Key: fileName,
      Body: file,
      ContentType: mimeType,
    });

    await s3Client.send(command);

    // Construct file URL
    const baseUrl = s3BaseUrl.endsWith('/') ? s3BaseUrl.slice(0, -1) : s3BaseUrl;
    const fileUrl = baseUrl ? `${baseUrl}/${fileName}` : `https://${bucketName}.s3.${s3Client.config.region}.amazonaws.com/${fileName}`;

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
 * Upload PDF file to S3
 */
export const uploadPDFToS3 = async (
  file: Buffer,
  originalName: string,
  checkoutId: string,
  config?: S3Config
): Promise<UploadResult> => {
  try {
    const s3Client = getS3Client(config);
    const bucketName = config?.bucket || process.env.AWS_S3_BUCKET_NAME || '';
    const s3BaseUrl = config?.s3Url || process.env.AWS_S3_BASE_URL || '';

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const fileName = `checkout-reports/${checkoutId}/${timestamp}-${originalName}`;

    const command = new PutObjectCommand({
      Bucket: bucketName,
      Key: fileName,
      Body: file,
      ContentType: 'application/pdf',
      Metadata: {
        'checkout-id': checkoutId,
        'generated-at': new Date().toISOString(),
        'file-type': 'checkout-report'
      }
    });

    await s3Client.send(command);

    const baseUrl = s3BaseUrl.endsWith('/') ? s3BaseUrl.slice(0, -1) : s3BaseUrl;
    const fileUrl = baseUrl ? `${baseUrl}/${fileName}` : `https://${bucketName}.s3.${s3Client.config.region}.amazonaws.com/${fileName}`;

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

export const deleteFromS3 = async (fileName: string, config?: S3Config): Promise<void> => {
  try {
    const s3Client = getS3Client(config);
    const bucketName = config?.bucket || process.env.AWS_S3_BUCKET_NAME || '';

    const command = new DeleteObjectCommand({
      Bucket: bucketName,
      Key: fileName,
    });

    await s3Client.send(command);
  } catch (error: any) {
    console.error('S3 Delete Error:', error);
    throw new Error(`Failed to delete file from S3: ${error.message}`);
  }
};

/**
 * Validate file type
 */
export const isValidFileType = (mimeType: string): boolean => {
  const allowedTypes = [
    'image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml',
    'video/mp4', 'video/mpeg', 'video/quicktime', 'video/x-msvideo', 'video/webm',
    'application/pdf',
  ];
  return allowedTypes.includes(mimeType);
};

/**
 * Validate file size
 */
export const isValidFileSize = (fileSize: number): boolean => {
  const maxSize = 50 * 1024 * 1024; // 50MB
  return fileSize <= maxSize;
};

export const cleanupOldPDFs = async (olderThanDays: number = 90): Promise<void> => {
  console.log(`Cleanup function available for PDFs older than ${olderThanDays} days`);
};
