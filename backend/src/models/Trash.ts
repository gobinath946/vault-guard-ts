import mongoose, { Document, Schema } from 'mongoose';

export interface ITrash extends Document {
  companyId: mongoose.Types.ObjectId;
  itemId: mongoose.Types.ObjectId;
  itemType: 'collection' | 'folder' | 'organization' | 'password' | 'user';
  itemName: string;
  originalData: any;
  deletedBy: mongoose.Types.ObjectId;
  deletedFrom: string; // Section from which it was deleted
  deletedAt: Date;
  isRestored: boolean;
  restoredAt?: Date;
  restoredBy?: mongoose.Types.ObjectId;
}

const trashSchema = new Schema<ITrash>(
  {
    companyId: {
      type: Schema.Types.ObjectId,
      ref: 'Company',
      required: true,
    },
    itemId: {
      type: Schema.Types.ObjectId,
      required: true,
    },
    itemType: {
      type: String,
      enum: ['collection', 'folder', 'organization', 'password', 'user'],
      required: true,
    },
    itemName: {
      type: String,
      required: true,
      trim: true,
    },
    originalData: {
      type: Schema.Types.Mixed,
      required: true,
    },
    deletedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    deletedFrom: {
      type: String,
      required: true,
      trim: true,
    },
    deletedAt: {
      type: Date,
      default: Date.now,
    },
    isRestored: {
      type: Boolean,
      default: false,
    },
    restoredAt: {
      type: Date,
    },
    restoredBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
  },
  {
    timestamps: true,
  }
);

// Index for better query performance
trashSchema.index({ companyId: 1, isRestored: 1, deletedAt: -1 });
trashSchema.index({ itemId: 1, itemType: 1 });

export default mongoose.model<ITrash>('Trash', trashSchema);