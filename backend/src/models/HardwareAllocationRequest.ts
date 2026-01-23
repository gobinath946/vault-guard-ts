import mongoose, { Document, Schema } from 'mongoose';

export interface IHardwareAllocationRequest extends Document {
  companyId: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  hardwareAssetId: mongoose.Types.ObjectId;
  remarks?: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  requestedBy: mongoose.Types.ObjectId;
  requestedAt: Date;
  processedAt?: Date;
  emailMessageId?: string;
  createdAt: Date;
  updatedAt: Date;
}

const hardwareAllocationRequestSchema = new Schema<IHardwareAllocationRequest>(
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
    hardwareAssetId: {
      type: Schema.Types.ObjectId,
      ref: 'HardwareAsset',
      required: true,
    },
    remarks: {
      type: String,
      default: '',
    },
    status: {
      type: String,
      enum: ['PENDING', 'APPROVED', 'REJECTED'],
      default: 'PENDING',
    },
    requestedBy: {
      type: Schema.Types.ObjectId,
      ref: 'Company',
      required: true,
    },
    requestedAt: {
      type: Date,
      default: Date.now,
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

hardwareAllocationRequestSchema.index({ companyId: 1, status: 1 });
hardwareAllocationRequestSchema.index({ emailMessageId: 1 });

export default mongoose.model<IHardwareAllocationRequest>('HardwareAllocationRequest', hardwareAllocationRequestSchema);
