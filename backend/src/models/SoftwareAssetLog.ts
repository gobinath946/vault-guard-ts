import mongoose, { Document, Schema } from 'mongoose';

export interface ISoftwareAssetLog extends Document {
  softwareAssetId: mongoose.Types.ObjectId;
  action: 'create' | 'update' | 'delete';
  field?: string; // Which field was changed
  oldValue?: string; // Previous value
  newValue?: string; // New value
  performedBy: mongoose.Types.ObjectId; // User who performed the action
  performedByName?: string; // Name of user who performed the action
  performedByEmail?: string; // Email of user who performed the action
  timestamp: Date;
  details?: string; // Additional context or metadata
  assetName?: string; // Asset name for easier querying
}

const softwareAssetLogSchema = new Schema<ISoftwareAssetLog>(
  {
    softwareAssetId: {
      type: Schema.Types.ObjectId,
      ref: 'SoftwareAsset',
      required: true,
    },
    action: {
      type: String,
      enum: ['create', 'update', 'delete'],
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
    assetName: {
      type: String,
      trim: true,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes for faster queries
softwareAssetLogSchema.index({ softwareAssetId: 1, timestamp: -1 });
softwareAssetLogSchema.index({ performedBy: 1, timestamp: -1 });

export default mongoose.model<ISoftwareAssetLog>('SoftwareAssetLog', softwareAssetLogSchema);
