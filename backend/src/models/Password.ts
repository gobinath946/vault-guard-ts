import mongoose, { Document, Schema } from 'mongoose';

export interface IPassword extends Document {
  companyId: mongoose.Types.ObjectId;
  itemName: string;
  username: string;
  password: string;
  websiteUrl: string;
  notes: string;
  folderId?: mongoose.Types.ObjectId;
  collectionId?: mongoose.Types.ObjectId;
  organizationId?: mongoose.Types.ObjectId;
  sourceType: string;
  createdBy: mongoose.Types.ObjectId;
  sharedWith: mongoose.Types.ObjectId[];
  createdAt: Date;
  updatedAt: Date;
  lastModified: Date;
}

const passwordSchema = new Schema<IPassword>(
  {
    companyId: {
      type: Schema.Types.ObjectId,
      ref: 'Company',
      required: true,
    },
    itemName: {
      type: String,
      required: true,
      trim: true,
    },
    username: {
      type: String,
      required: true,
    },
    password: {
      type: String,
      required: true,
    },
    websiteUrl: {
      type: String,
      trim: true,
    },
    notes: {
      type: String,
      trim: true,
    },
    folderId: {
      type: Schema.Types.ObjectId,
      ref: 'Folder',
    },
    collectionId: {
      type: Schema.Types.ObjectId,
      ref: 'Collection',
    },
    organizationId: {
      type: Schema.Types.ObjectId,
      ref: 'Organization',
    },
    sourceType: {
      type: String,
      enum: ['organization', 'folder', 'collection'],
      required: true,
    },
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
    lastModified: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

export default mongoose.model<IPassword>('Password', passwordSchema);