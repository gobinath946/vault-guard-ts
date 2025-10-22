import mongoose, { Document, Schema } from 'mongoose';

export interface IOrganization extends Document {
  organizationName: string;
  organizationEmail: string;
  createdBy: mongoose.Types.ObjectId;
  companyId: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const organizationSchema = new Schema<IOrganization>(
  {
    organizationName: {
      type: String,
      required: true,
      trim: true,
    },
    organizationEmail: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    companyId: {
      type: Schema.Types.ObjectId,
      ref: 'Company',
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

export default mongoose.model<IOrganization>('Organization', organizationSchema);