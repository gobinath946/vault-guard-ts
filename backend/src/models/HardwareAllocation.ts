import mongoose, { Document, Schema } from 'mongoose';

export interface IHardwareAllocation extends Document {
  companyId: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  hardwareAssetId: mongoose.Types.ObjectId;
  assignedDate: Date;
  returnedDate?: Date;
  status: 'ACTIVE' | 'RETURNED' | 'DELETED';
  remarks?: string;
  isDeleted: boolean;
  createdBy: mongoose.Types.ObjectId;
  updatedBy?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const hardwareAllocationSchema = new Schema<IHardwareAllocation>(
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
    assignedDate: {
      type: Date,
      default: Date.now,
    },
    returnedDate: {
      type: Date,
    },
    status: {
      type: String,
      enum: ['ACTIVE', 'RETURNED', 'DELETED'],
      default: 'ACTIVE',
    },
    remarks: {
      type: String,
      trim: true,
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

// Indexes for better performance
hardwareAllocationSchema.index({ companyId: 1, isDeleted: 1 });
hardwareAllocationSchema.index({ companyId: 1, userId: 1 });
hardwareAllocationSchema.index({ companyId: 1, hardwareAssetId: 1 });
hardwareAllocationSchema.index({ companyId: 1, status: 1 });

export default mongoose.model<IHardwareAllocation>('HardwareAllocation', hardwareAllocationSchema);