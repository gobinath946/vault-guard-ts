import mongoose, { Document, Schema } from 'mongoose';

export interface ISoftwareAllocationLog extends Document {
  softwareAllocationId: mongoose.Types.ObjectId;
  softwareAssetId?: mongoose.Types.ObjectId; // For easier querying
  userId?: mongoose.Types.ObjectId; // For easier querying
  action: 'create' | 'update' | 'delete' | 'allocate' | 'revoke' | 'expired';
  field?: string; // Which field was changed
  oldValue?: string; // Previous value
  newValue?: string; // New value
  performedBy: mongoose.Types.ObjectId; // User who performed the action
  performedByName?: string; // Name of user who performed the action
  performedByEmail?: string; // Email of user who performed the action
  timestamp: Date;
  details?: string; // Additional context or metadata
  // Allocation specific fields
  allocatedToUserId?: mongoose.Types.ObjectId; // User who received the allocation
  allocatedToUserName?: string;
  allocatedToUserEmail?: string;
  allocatedDate?: Date;
  expiryDate?: Date;
  licenseCount?: number;
  remarks?: string;
}

const softwareAllocationLogSchema = new Schema<ISoftwareAllocationLog>(
  {
    softwareAllocationId: {
      type: Schema.Types.ObjectId,
      ref: 'SoftwareAllocation',
      required: true,
    },
    softwareAssetId: {
      type: Schema.Types.ObjectId,
      ref: 'SoftwareAsset',
    },
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    action: {
      type: String,
      enum: ['create', 'update', 'delete', 'allocate', 'revoke', 'expired'],
      required: true,
    },
    field: {
      type: String,
      trim: true,
    },
    oldValue: {
      type: String,
      trim: true,
    },
    newValue: {
      type: String,
      trim: true,
    },
    performedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    performedByName: {
      type: String,
      trim: true,
    },
    performedByEmail: {
      type: String,
      trim: true,
    },
    timestamp: {
      type: Date,
      default: Date.now,
    },
    details: {
      type: String,
      trim: true,
    },
    allocatedToUserId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    allocatedToUserName: {
      type: String,
      trim: true,
    },
    allocatedToUserEmail: {
      type: String,
      trim: true,
    },
    allocatedDate: {
      type: Date,
    },
    expiryDate: {
      type: Date,
    },
    licenseCount: {
      type: Number,
    },
    remarks: {
      type: String,
      trim: true,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes for faster queries
softwareAllocationLogSchema.index({ softwareAllocationId: 1, timestamp: -1 });
softwareAllocationLogSchema.index({ softwareAssetId: 1, timestamp: -1 });
softwareAllocationLogSchema.index({ userId: 1, timestamp: -1 });
softwareAllocationLogSchema.index({ performedBy: 1, timestamp: -1 });

export default mongoose.model<ISoftwareAllocationLog>('SoftwareAllocationLog', softwareAllocationLogSchema);




