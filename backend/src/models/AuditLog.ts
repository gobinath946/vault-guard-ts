import mongoose, { Document, Schema } from 'mongoose';

export interface IAuditLog extends Document {
  userId: mongoose.Types.ObjectId;
  userEmail: string;
  userName: string;
  userRole: string;
  companyId: mongoose.Types.ObjectId;
  action: 'login' | 'view_username' | 'copy_username' | 'view_password' | 'copy_password' | 'edit_password';
  resourceType?: 'password';
  resourceId?: mongoose.Types.ObjectId;
  resourceName?: string;
  ipAddress: string;
  location?: {
    country?: string;
    region?: string;
    city?: string;
    latitude?: number;
    longitude?: number;
  };
  userAgent?: string;
  changes?: {
    field: string;
    oldValue?: string;
    newValue?: string;
  }[];
  timestamp: Date;
  metadata?: any;
}

const auditLogSchema = new Schema<IAuditLog>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      required: true,
      index: true,
    },
    userEmail: {
      type: String,
      required: true,
      trim: true,
    },
    userName: {
      type: String,
      required: true,
      trim: true,
    },
    userRole: {
      type: String,
      required: true,
      enum: ['master_admin', 'company_super_admin', 'company_user'],
    },
    companyId: {
      type: Schema.Types.ObjectId,
      ref: 'Company',
      required: true,
      index: true,
    },
    action: {
      type: String,
      enum: ['login', 'view_username', 'copy_username', 'view_password', 'copy_password', 'edit_password'],
      required: true,
      index: true,
    },
    resourceType: {
      type: String,
      enum: ['password'],
    },
    resourceId: {
      type: Schema.Types.ObjectId,
      index: true,
    },
    resourceName: {
      type: String,
      trim: true,
    },
    ipAddress: {
      type: String,
      required: true,
    },
    location: {
      country: String,
      region: String,
      city: String,
      latitude: Number,
      longitude: Number,
    },
    userAgent: {
      type: String,
    },
    changes: [
      {
        field: String,
        oldValue: String,
        newValue: String,
      },
    ],
    timestamp: {
      type: Date,
      default: Date.now,
      index: true,
    },
    metadata: {
      type: Schema.Types.Mixed,
    },
  },
  {
    timestamps: true,
  }
);

// Compound indexes for efficient queries
auditLogSchema.index({ userId: 1, timestamp: -1 });
auditLogSchema.index({ companyId: 1, timestamp: -1 });
auditLogSchema.index({ resourceId: 1, timestamp: -1 });
auditLogSchema.index({ action: 1, timestamp: -1 });

export default mongoose.model<IAuditLog>('AuditLog', auditLogSchema);
