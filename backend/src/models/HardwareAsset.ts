import mongoose, { Document, Schema } from 'mongoose';

export interface IHardwareAsset extends Document {
  companyId: mongoose.Types.ObjectId;
  assetName?: string;
  assetType?: string;
  brand?: string;
  assetModel?: string; // Changed from 'model' to 'assetModel' to avoid conflict
  serialNumber?: string;
  purchaseDate?: Date;
  status: 'AVAILABLE' | 'ASSIGNED' | 'RETURNED' | 'DELETED';
  remarks?: string;
  isDeleted: boolean;
  createdBy: mongoose.Types.ObjectId;
  updatedBy?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const hardwareAssetSchema = new Schema<IHardwareAsset>(
  {
    companyId: {
      type: Schema.Types.ObjectId,
      ref: 'Company',
      required: true,
    },
    assetName: {
      type: String,
      required: false,
      trim: true,
    },
    assetType: {
      type: String,
      required: false,
      trim: true,
    },
    brand: {
      type: String,
      required: false,
      trim: true,
    },
    assetModel: {
      type: String,
      required: false,
      trim: true,
    },
    serialNumber: {
      type: String,
      required: false,
      trim: true,
    },
    purchaseDate: {
      type: Date,
    },
    status: {
      type: String,
      enum: ['AVAILABLE', 'ASSIGNED', 'RETURNED', 'DELETED'],
      default: 'AVAILABLE',
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
hardwareAssetSchema.index({ companyId: 1, isDeleted: 1 });
hardwareAssetSchema.index({ companyId: 1, status: 1 });
// Serial number uniqueness is validated manually in the controller

export default mongoose.model<IHardwareAsset>('HardwareAsset', hardwareAssetSchema);