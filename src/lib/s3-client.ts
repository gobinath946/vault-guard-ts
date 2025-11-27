import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';

export interface S3Config {
  region: string;
  bucket: string;
  accessKey: string;
  secretKey: string;
  s3Url?: string;
}

export interface UploadResult {
  url: string;
  key: string;
  size: number;
  fileName: string;
  mimeType: string;
}

export class S3Uploader {
  private client: S3Client;
  private bucket: string;
  private baseUrl: string;

  constructor(config: S3Config) {
    this.client = new S3Client({
      region: config.region,
      credentials: {
        accessKeyId: config.accessKey,
        secretAccessKey: config.secretKey,
      },
    });
    this.bucket = config.bucket;
    this.baseUrl = config.s3Url || `https://${config.bucket}.s3.${config.region}.amazonaws.com`;
  }

  private generateFolderPath(companyName: string, category: string): string {
    const sanitizedCompanyName = companyName.replace(/[^a-zA-Z0-9-_]/g, '_');
    return `${sanitizedCompanyName}/passwords/${category}`;
  }

  async uploadFile(
    file: File,
    companyName: string,
    category: string = 'attachments'
  ): Promise<UploadResult> {
    const timestamp = Date.now();
    const sanitizedFileName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
    const fileName = `${timestamp}-${sanitizedFileName}`;
    const folderPath = this.generateFolderPath(companyName, category);
    const key = `${folderPath}/${fileName}`;

    const arrayBuffer = await file.arrayBuffer();

    const command = new PutObjectCommand({
      Bucket: this.bucket,
      Key: key,
      Body: new Uint8Array(arrayBuffer),
      ContentType: file.type,
      ACL: 'public-read',
    });

    await this.client.send(command);

    const url = this.baseUrl.endsWith('/')
      ? `${this.baseUrl}${key}`
      : `${this.baseUrl}/${key}`;

    return {
      url,
      key,
      size: file.size,
      fileName: file.name,
      mimeType: file.type,
    };
  }

  async deleteFile(key: string): Promise<void> {
    const command = new DeleteObjectCommand({
      Bucket: this.bucket,
      Key: key,
    });
    await this.client.send(command);
  }

  getPublicUrl(key: string): string {
    return this.baseUrl.endsWith('/')
      ? `${this.baseUrl}${key}`
      : `${this.baseUrl}/${key}`;
  }
}
