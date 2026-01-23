import mongoose, { Document, Schema } from 'mongoose';

export interface IUser extends Document {
  companyId: mongoose.Types.ObjectId;
  email: string;
  username: string;
  employeeId?: string;
  password: string;

  role: 'company_user' | 'company_super_admin';
  isPrimaryAdmin: boolean;
  isActive: boolean;
  offboardingInactive: boolean;
  emailStatus: 'Active' | 'Inactive';
  isCheckoutStarted: boolean;
  checkoutStatus?: 'In Progress' | 'Completed' | 'Failed';
  permissions: {
    organizations: mongoose.Types.ObjectId[];
    collections: mongoose.Types.ObjectId[];
    folders: mongoose.Types.ObjectId[];
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
    employeeId: {
      type: String,
      trim: true,
      sparse: true,
    },
    password: {
      type: String,
      required: true,
    },
    role: {
      type: String,
      default: 'company_user',
      enum: ['company_user', 'company_super_admin'],
    },
    isPrimaryAdmin: {
      type: Boolean,
      default: false,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    offboardingInactive: {
      type: Boolean,
      default: false,
    },
    emailStatus: {
      type: String,
      enum: ['Active', 'Inactive'],
      default: 'Active',
    },
    isCheckoutStarted: {
      type: Boolean,
      default: false,
    },
    checkoutStatus: {
      type: String,
      enum: ['Initiated', 'In Progress', 'Completed', 'Failed'],
    },
    permissions: {
      organizations: [{
        type: Schema.Types.ObjectId,
        ref: 'Organization'
      }],
      collections: [{
        type: Schema.Types.ObjectId,
        ref: 'Collection'
      }],
      folders: [{
        type: Schema.Types.ObjectId,
        ref: 'Folder'
      }]
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

// Index for better query performance
userSchema.index({ companyId: 1, email: 1 });
userSchema.index({ companyId: 1, isActive: 1 });

export default mongoose.model<IUser>('User', userSchema);