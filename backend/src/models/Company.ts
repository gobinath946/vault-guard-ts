import mongoose, { Document, Schema } from 'mongoose';

export interface IS3Config {
  accessKey: string;
  secretKey: string;
  region: string;
  bucket: string;
  s3Url?: string;
}

export interface IEmailConfig {
  service: string;
  host?: string;
  port?: number;
  secure?: boolean;
  user: string;
  pass: string;
  from: string;
}

export interface ICompany extends Document {
  companyName: string;
  email: string;
  contactName: string;
  phoneNumber: string;
  city: string;
  state: string;
  pinCode: string;
  country: string;
  password: string;
  role: 'company_super_admin';
  isActive: boolean;
  s3Config?: IS3Config;
  emailConfig?: IEmailConfig;
  createdAt: Date;
  updatedAt: Date;
}

const companySchema = new Schema<ICompany>(
  {
    companyName: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    contactName: {
      type: String,
      required: true,
      trim: true,
    },
    phoneNumber: {
      type: String,
      required: true,
    },
    city: {
      type: String,
      required: true,
    },
    state: {
      type: String,
      required: true,
    },
    pinCode: {
      type: String,
      required: true,
    },
    country: {
      type: String,
      required: true,
    },
    password: {
      type: String,
      required: true,
    },
    role: {
      type: String,
      default: 'company_super_admin',
      enum: ['company_super_admin'],
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    s3Config: {
      accessKey: { type: String, default: '' },
      secretKey: { type: String, default: '' },
      region: { type: String, default: '' },
      bucket: { type: String, default: '' },
      s3Url: { type: String, default: '' },
    },
    emailConfig: {
      service: { type: String, default: 'gmail' },
      host: { type: String, default: '' },
      port: { type: Number, default: 587 },
      secure: { type: Boolean, default: false },
      user: { type: String, default: '' },
      pass: { type: String, default: '' },
      from: { type: String, default: '' },
    },
  },
  {
    timestamps: true,
  }
);

export default mongoose.model<ICompany>('Company', companySchema);
