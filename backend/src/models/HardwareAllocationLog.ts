import mongoose, { Document, Schema } from 'mongoose';

export interface IHardwareAllocationLog extends Document {
  hardwareAllocationId: mongoose.Types.ObjectId;
  hardwareAssetId?: mongoose.Types.ObjectId; // For easier querying
  userId?: mongoose.Types.ObjectId; // For easier querying
  action: 'create' | 'update' | 'delete' | 'assign' | 'return';
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
  returnedDate?: Date;
  remarks?: string;
}

const hardwareAllocationLogSchema = new Schema<IHardwareAllocationLog>(
  {
    hardwareAllocationId: {
      type: Schema.Types.ObjectId,
      ref: 'HardwareAllocation',
      required: true,
    },
    hardwareAssetId: {
      type: Schema.Types.ObjectId,
      ref: 'HardwareAsset',
    },
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    action: {
      type: String,
      enum: ['create', 'update', 'delete', 'assign', 'return'],
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
    returnedDate: {
      type: Date,
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
hardwareAllocationLogSchema.index({ hardwareAllocationId: 1, timestamp: -1 });
hardwareAllocationLogSchema.index({ hardwareAssetId: 1, timestamp: -1 });
hardwareAllocationLogSchema.index({ userId: 1, timestamp: -1 });
hardwareAllocationLogSchema.index({ performedBy: 1, timestamp: -1 });

export default mongoose.model<IHardwareAllocationLog>('HardwareAllocationLog', hardwareAllocationLogSchema);
