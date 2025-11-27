import mongoose, { Document, Schema } from 'mongoose';

export interface IAttachment {
  fileUrl: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
  s3Key: string;
  uploadedAt: Date;
}

export interface IPassword extends Document {
  companyId: mongoose.Types.ObjectId;
  itemName: string;
  username: string;
  password: string;
  websiteUrls: string[];
  notes: string;
  attachments: IAttachment[];
  folderId?: mongoose.Types.ObjectId;
  collectionId?: mongoose.Types.ObjectId;
  organizationId?: mongoose.Types.ObjectId;
  sourceType: string;
  createdBy: mongoose.Types.ObjectId;
  sharedWith: mongoose.Types.ObjectId[];
  logs?: mongoose.Types.ObjectId[]; // References to PasswordLog entries
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
    websiteUrls: {
      type: [String],
      default: [],
    },
    notes: {
      type: String,
      trim: true,
    },
    attachments: [
      {
        fileUrl: {
          type: String,
          required: true,
        },
        fileName: {
          type: String,
          required: true,
        },
        fileSize: {
          type: Number,
          required: true,
        },
        mimeType: {
          type: String,
          required: true,
        },
        s3Key: {
          type: String,
          required: true,
        },
        uploadedAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],
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
    logs: [
      {
        type: Schema.Types.ObjectId,
        ref: 'PasswordLog',
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