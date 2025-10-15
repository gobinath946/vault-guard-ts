import mongoose, { Document, Schema } from 'mongoose';

export interface IMasterAdmin extends Document {
  email: string;
  password: string;
  role: 'master_admin';
  createdAt: Date;
  updatedAt: Date;
}

const masterAdminSchema = new Schema<IMasterAdmin>(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    password: {
      type: String,
      required: true,
    },
    role: {
      type: String,
      default: 'master_admin',
      enum: ['master_admin'],
    },
  },
  {
    timestamps: true,
  }
);

export default mongoose.model<IMasterAdmin>('MasterAdmin', masterAdminSchema);
