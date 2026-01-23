import mongoose, { Document, Schema } from 'mongoose';

export interface ISoftwareAllocationRequest extends Document {
  companyId: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  softwareAssetId: mongoose.Types.ObjectId;
  licenseCount: number;
  expiryDate?: Date;
  remarks?: string;
  requestedBy: mongoose.Types.ObjectId;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  processedAt?: Date;
  emailMessageId?: string;
  createdAt: Date;
  updatedAt: Date;
}

const softwareAllocationRequestSchema = new Schema<ISoftwareAllocationRequest>(
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
    expiryDate: {
      type: Date,
    },
    remarks: {
      type: String,
      trim: true,
    },
    requestedBy: {
      type: Schema.Types.ObjectId,
      ref: 'Company',
      required: true,
    },
    status: {
      type: String,
      enum: ['PENDING', 'APPROVED', 'REJECTED'],
      default: 'PENDING',
    },
    processedAt: {
      type: Date,
    },
    emailMessageId: {
      type: String,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes
softwareAllocationRequestSchema.index({ companyId: 1, status: 1 });
softwareAllocationRequestSchema.index({ userId: 1 });
softwareAllocationRequestSchema.index({ softwareAssetId: 1 });

export default mongoose.model<ISoftwareAllocationRequest>('SoftwareAllocationRequest', softwareAllocationRequestSchema);
