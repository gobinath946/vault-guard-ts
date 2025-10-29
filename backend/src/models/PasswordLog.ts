import mongoose, { Document, Schema } from 'mongoose';

export interface IPasswordLog extends Document {
  passwordId: mongoose.Types.ObjectId;
  action: 'create' | 'update' | 'delete' | 'view';
  field?: string; // Which field was changed (e.g., 'itemName', 'username', 'password')
  oldValue?: string; // Previous value (encrypted for sensitive fields)
  newValue?: string; // New value (encrypted for sensitive fields)
  performedBy: mongoose.Types.ObjectId; // User who performed the action
  timestamp: Date;
  details?: string; // Additional context or metadata
}

const passwordLogSchema = new Schema<IPasswordLog>(
  {
    passwordId: {
      type: Schema.Types.ObjectId,
      ref: 'Password',
      required: true,
    },
    action: {
      type: String,
      enum: ['create', 'update', 'delete', 'view'],
      required: true,
    },
    field: {
      type: String,
      trim: true,
    },
    oldValue: {
      type: String,
      trim: true,
    },
    newValue: {
      type: String,
      trim: true,
    },
    performedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    timestamp: {
      type: Date,
      default: Date.now,
    },
    details: {
      type: String,
      trim: true,
    },
  },
  {
    timestamps: true,
  }
);

// Index for faster queries
passwordLogSchema.index({ passwordId: 1, timestamp: -1 });
passwordLogSchema.index({ performedBy: 1, timestamp: -1 });

export default mongoose.model<IPasswordLog>('PasswordLog', passwordLogSchema);

