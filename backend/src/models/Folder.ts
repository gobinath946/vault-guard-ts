import mongoose, { Document, Schema } from 'mongoose';

export interface IFolder extends Document {
  companyId: mongoose.Types.ObjectId;
  folderName: string;
  parentFolderId?: mongoose.Types.ObjectId;
  createdBy: mongoose.Types.ObjectId;
  sharedWith: mongoose.Types.ObjectId[];
  createdAt: Date;
  updatedAt: Date;
}

const folderSchema = new Schema<IFolder>(
  {
    companyId: {
      type: Schema.Types.ObjectId,
      ref: 'Company',
      required: true,
    },
    folderName: {
      type: String,
      required: true,
      trim: true,
    },
    parentFolderId: {
      type: Schema.Types.ObjectId,
      ref: 'Folder',
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
  },
  {
    timestamps: true,
  }
);

export default mongoose.model<IFolder>('Folder', folderSchema);
