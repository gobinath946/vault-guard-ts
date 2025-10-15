import mongoose, { Document, Schema } from 'mongoose';

export interface IUser extends Document {
  companyId: mongoose.Types.ObjectId;
  email: string;
  username: string;
  password: string;
  role: 'company_user';
  isActive: boolean;
  permissions: {
    folders: mongoose.Types.ObjectId[];
    collections: mongoose.Types.ObjectId[];
    passwords: mongoose.Types.ObjectId[];
  };
  createdBy: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const userSchema = new Schema<IUser>(
  {
    companyId: {
      type: Schema.Types.ObjectId,
      ref: 'Company',
      required: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    username: {
      type: String,
      required: true,
      trim: true,
    },
    password: {
      type: String,
      required: true,
    },
    role: {
      type: String,
      default: 'company_user',
      enum: ['company_user'],
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    permissions: {
      folders: [{ type: Schema.Types.ObjectId, ref: 'Folder' }],
      collections: [{ type: Schema.Types.ObjectId, ref: 'Collection' }],
      passwords: [{ type: Schema.Types.ObjectId, ref: 'Password' }],
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'Company',
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

export default mongoose.model<IUser>('User', userSchema);
