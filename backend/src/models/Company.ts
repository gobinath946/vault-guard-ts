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

export interface IAssetAllocationEmailConfig {
  to: string;
  subject: string;
  body: string;
  infraEmail?: string;
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
  assetAllocationEmailConfig?: IAssetAllocationEmailConfig;
  isPrimaryAdmin: boolean;
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
    assetAllocationEmailConfig: {
      to: { type: String, default: '' },
      subject: { type: String, default: 'Asset Allocation Request - {{assetName}} for {{userName}}' },
      body: {
        type: String,
        default: '<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Hardware Asset Allocation Request</title></head><body style="font-family: \'Segoe UI\', Tahoma, Geneva, Verdana, sans-serif; background-color: #f5f5f5; margin: 0; padding: 20px;"><table width="100%" cellpadding="0" cellspacing="0" style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1);"><tr><td style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px 40px; text-align: center;"><h1 style="color: #ffffff; margin: 0; font-size: 24px; font-weight: 600;">Hardware Asset Allocation Request</h1></td></tr><tr><td style="padding: 40px;"><p style="color: #333333; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">Dear Team,</p><p style="color: #555555; font-size: 15px; line-height: 1.6; margin: 0 0 30px 0;">A new hardware asset allocation request requires your approval. Please review the details below and take appropriate action.</p><table width="100%" cellpadding="12" cellspacing="0" style="border: 1px solid #e0e0e0; border-radius: 6px; margin-bottom: 30px;"><tr style="background-color: #f9fafb;"><td style="width: 35%; color: #666666; font-size: 14px; font-weight: 600; border-bottom: 1px solid #e0e0e0;">Employee Name</td><td style="color: #333333; font-size: 14px; border-bottom: 1px solid #e0e0e0;">{{userName}}</td></tr><tr><td style="color: #666666; font-size: 14px; font-weight: 600; border-bottom: 1px solid #e0e0e0; background-color: #f9fafb;">Email Address</td><td style="color: #333333; font-size: 14px; border-bottom: 1px solid #e0e0e0;">{{userEmail}}</td></tr><tr style="background-color: #f9fafb;"><td style="color: #666666; font-size: 14px; font-weight: 600; border-bottom: 1px solid #e0e0e0;">Asset Name</td><td style="color: #333333; font-size: 14px; border-bottom: 1px solid #e0e0e0;">{{assetName}}</td></tr><tr><td style="color: #666666; font-size: 14px; font-weight: 600; border-bottom: 1px solid #e0e0e0; background-color: #f9fafb;">Brand & Model</td><td style="color: #333333; font-size: 14px; border-bottom: 1px solid #e0e0e0;">{{assetBrand}} {{assetModel}}</td></tr><tr style="background-color: #f9fafb;"><td style="color: #666666; font-size: 14px; font-weight: 600; border-bottom: 1px solid #e0e0e0;">Serial Number</td><td style="color: #333333; font-size: 14px; border-bottom: 1px solid #e0e0e0;">{{serialNumber}}</td></tr><tr><td style="color: #666666; font-size: 14px; font-weight: 600; background-color: #f9fafb;">Remarks</td><td style="color: #333333; font-size: 14px;">{{remarks}}</td></tr></table><table width="100%" cellpadding="0" cellspacing="0" style="margin: 30px 0;"><tr><td align="center"><table cellpadding="0" cellspacing="0"><tr><td style="padding-right: 10px;"><a href="{{approveLink}}" style="display: inline-block; background-color: #10b981; color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 6px; font-size: 15px; font-weight: 600; box-shadow: 0 2px 4px rgba(16, 185, 129, 0.3);">Approve</a></td><td style="padding-left: 10px;"><a href="{{rejectLink}}" style="display: inline-block; background-color: #ef4444; color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 6px; font-size: 15px; font-weight: 600; box-shadow: 0 2px 4px rgba(239, 68, 68, 0.3);">Reject</a></td></tr></table></td></tr></table><p style="color: #888888; font-size: 13px; line-height: 1.5; margin: 30px 0 0 0; padding-top: 20px; border-top: 1px solid #e0e0e0;"><strong>Note:</strong> This is an automated request. Please click one of the buttons above to process this allocation. Each request can only be processed once.</p></td></tr><tr><td style="background-color: #f9fafb; padding: 20px 40px; text-align: center; border-top: 1px solid #e0e0e0;"><p style="color: #888888; font-size: 12px; margin: 0;">Asset Management System | Automated Notification</p></td></tr></table></body></html>'
      },
      infraEmail: { type: String, default: '' },
    },
    isPrimaryAdmin: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

export default mongoose.model<ICompany>('Company', companySchema);
