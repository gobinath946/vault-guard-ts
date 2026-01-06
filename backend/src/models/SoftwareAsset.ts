import mongoose, { Document, Schema } from 'mongoose';

export interface ISoftwareAsset extends Document {
  companyId: mongoose.Types.ObjectId;
  softwareName?: string;
  vendor?: string;
  customFields?: { [key: string]: any };
  totalLicenseCount?: number;
  availableLicenseCount?: number;
  startDate?: Date;
  endDate?: Date;
  status: 'ACTIVE' | 'ASSIGNED' | 'EXPIRED' | 'DELETED';
  isDeleted: boolean;
  createdBy: mongoose.Types.ObjectId;
  updatedBy?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const softwareAssetSchema = new Schema<ISoftwareAsset>(
  {
    companyId: {
      type: Schema.Types.ObjectId,
      ref: 'Company',
      required: true,
    },
    softwareName: {
      type: String,
      required: false,
      trim: true,
    },
    vendor: {
      type: String,
      required: false,
      trim: true,
    },
    customFields: {
      type: Schema.Types.Mixed,
      default: {},
    },
    totalLicenseCount: {
      type: Number,
      required: false,
      min: 0,
    },
    availableLicenseCount: {
      type: Number,
      required: false,
      min: 0,
    },
    startDate: {
      type: Date,
    },
    endDate: {
      type: Date,
    },
    status: {
      type: String,
      enum: ['ACTIVE', 'ASSIGNED', 'EXPIRED', 'DELETED'],
      default: 'ACTIVE',
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
softwareAssetSchema.index({ companyId: 1, isDeleted: 1 });
softwareAssetSchema.index({ companyId: 1, status: 1 });
softwareAssetSchema.index({ companyId: 1, softwareName: 1 });

export default mongoose.model<ISoftwareAsset>('SoftwareAsset', softwareAssetSchema);