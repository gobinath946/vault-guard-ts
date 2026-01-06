import mongoose, { Document, Schema } from 'mongoose';
import crypto from 'crypto';

export interface ISoftwareAllocation extends Document {
  companyId: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  softwareAssetId: mongoose.Types.ObjectId;
  licenseCount: number;
  assignedDate: Date;
  expiryDate?: Date;
  status: 'ACTIVE' | 'EXPIRED' | 'DELETED';
  remarks?: string;
  credentials?: {
    encryptedData: string;
    iv: string;
  };
  customFields?: { [key: string]: any };
  isDeleted: boolean;
  createdBy: mongoose.Types.ObjectId;
  updatedBy?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
  encryptCredentials(credentials: string): void;
  decryptCredentials(): string;
}

const softwareAllocationSchema = new Schema<ISoftwareAllocation>(
  {
    companyId: {
      type: Schema.Types.ObjectId,
      ref: 'Company',
      required: true,
    },
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    softwareAssetId: {
      type: Schema.Types.ObjectId,
      ref: 'SoftwareAsset',
      required: true,
    },
    licenseCount: {
      type: Number,
      required: true,
      min: 1,
    },
    assignedDate: {
      type: Date,
      default: Date.now,
    },
    expiryDate: {
      type: Date,
    },
    status: {
      type: String,
      enum: ['ACTIVE', 'EXPIRED', 'DELETED'],
      default: 'ACTIVE',
    },
    remarks: {
      type: String,
      trim: true,
    },
    credentials: {
      encryptedData: {
        type: String,
      },
      iv: {
        type: String,
      },
    },
    customFields: {
      type: Schema.Types.Mixed,
      default: {},
    },
    isDeleted: {
      type: Boolean,
      default: false,
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'Company',
      required: true,
    },
    updatedBy: {
      type: Schema.Types.ObjectId,
      ref: 'Company',
    },
  },
  {
    timestamps: true,
  }
);

// Encryption methods
softwareAllocationSchema.methods.encryptCredentials = function(credentials: string): void {
  try {
    const algorithm = 'aes-256-cbc';
    const encryptionKey = process.env.ENCRYPTION_KEY!;
    
    // Ensure we have a 32-byte key for AES-256
    let key: Buffer;
    if (encryptionKey.length === 64) {
      // Hex string (64 chars = 32 bytes)
      key = Buffer.from(encryptionKey, 'hex');
    } else {
      // Create a 32-byte key from the string
      key = Buffer.alloc(32);
      key.write(encryptionKey.substring(0, 32), 'utf8');
    }
    
    const iv = crypto.randomBytes(16);
    
    const cipher = crypto.createCipheriv(algorithm, key, iv);
    let encrypted = cipher.update(credentials, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    this.credentials = {
      encryptedData: encrypted,
      iv: iv.toString('hex'),
    };
  } catch (error) {
    console.error('Encryption error:', error);
    throw new Error('Failed to encrypt credentials');
  }
};

softwareAllocationSchema.methods.decryptCredentials = function(): string {
  try {
    if (!this.credentials || !this.credentials.encryptedData || !this.credentials.iv) {
      return '{}';
    }
    
    const algorithm = 'aes-256-cbc';
    const encryptionKey = process.env.ENCRYPTION_KEY!;
    
    // Ensure we have a 32-byte key for AES-256
    let key: Buffer;
    if (encryptionKey.length === 64) {
      // Hex string (64 chars = 32 bytes)
      key = Buffer.from(encryptionKey, 'hex');
    } else {
      // Create a 32-byte key from the string
      key = Buffer.alloc(32);
      key.write(encryptionKey.substring(0, 32), 'utf8');
    }
    
    const iv = Buffer.from(this.credentials.iv, 'hex');
    
    const decipher = crypto.createDecipheriv(algorithm, key, iv);
    let decrypted = decipher.update(this.credentials.encryptedData, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  } catch (error) {
    console.error('Decryption error:', error);
    throw new Error('Failed to decrypt credentials');
  }
};

// Indexes for better performance
softwareAllocationSchema.index({ companyId: 1, isDeleted: 1 });
softwareAllocationSchema.index({ companyId: 1, userId: 1 });
softwareAllocationSchema.index({ companyId: 1, softwareAssetId: 1 });
softwareAllocationSchema.index({ companyId: 1, status: 1 });

export default mongoose.model<ISoftwareAllocation>('SoftwareAllocation', softwareAllocationSchema);