import mongoose, { Document, Schema } from 'mongoose';

export interface ICollection extends Document {
  organizationId?: mongoose.Types.ObjectId;
  companyId: mongoose.Types.ObjectId;
  collectionName: string;
  description: string;
  passwords: mongoose.Types.ObjectId[];
  createdBy: mongoose.Types.ObjectId;
  sharedWith: mongoose.Types.ObjectId[];
  createdAt: Date;
  updatedAt: Date;
}

const collectionSchema = new Schema<ICollection>(
  {
    companyId: {
      type: Schema.Types.ObjectId,
      ref: 'Company',
      required: true,
    },
    collectionName: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      trim: true,
    },
    organizationId: {
      type: Schema.Types.ObjectId,
      ref: 'Organization',
    },
    passwords: [
      {
        type: Schema.Types.ObjectId,
        ref: 'Password',
      },
    ],
    createdBy: {
      type: Schema.Types.ObjectId,
      required: true,
    },
    sharedWith: [
      {
        type: Schema.Types.ObjectId,
        ref: 'User',
      },
    ],
  },
  {
    timestamps: true,
  }
);

export default mongoose.model<ICollection>('Collection', collectionSchema);
