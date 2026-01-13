import mongoose, { Document, Schema } from 'mongoose';

export interface ICheckoutStep {
    stepIndex: number;
    title: string;
    status: 'Pending' | 'Completed';
    completedBy?: mongoose.Types.ObjectId;
    completedAt?: Date;
    data?: any;
    attachment?: {
        fileUrl: string;
        fileName: string;
        fileSize: number;
        mimeType: string;
        s3Key: string;
        uploadedAt: Date;
    };
}

export interface ICheckoutProcess extends Document {
    companyId: mongoose.Types.ObjectId;
    userId: mongoose.Types.ObjectId;
    status: 'Initiated' | 'In Progress' | 'Completed' | 'Failed';
    currentStep: number;
    steps: ICheckoutStep[];
    pdfPath?: string;
    pdfS3Url?: string;
    pdfS3Key?: string;
    pdfGeneratedAt?: Date;
    reportEmailSent: boolean;
    createdAt: Date;
    updatedAt: Date;
}

const checkoutStepSchema = new Schema({
    stepIndex: { type: Number, required: true },
    title: { type: String, required: true },
    status: { type: String, enum: ['Pending', 'Completed'], default: 'Pending' },
    completedBy: { type: Schema.Types.ObjectId, ref: 'Company' },
    completedAt: { type: Date },
    data: { type: Schema.Types.Mixed },
    attachment: {
        fileUrl: { type: String },
        fileName: { type: String },
        fileSize: { type: Number },
        mimeType: { type: String },
        s3Key: { type: String },
        uploadedAt: { type: Date }
    }
});

const checkoutProcessSchema = new Schema<ICheckoutProcess>(
    {
        companyId: {
            type: Schema.Types.ObjectId,
            ref: 'Company',
            required: true
        },
        userId: {
            type: Schema.Types.ObjectId,
            ref: 'User',
            required: true
        },
        status: {
            type: String,
            enum: ['Initiated', 'In Progress', 'Completed', 'Failed'],
            default: 'Initiated'
        },
        currentStep: {
            type: Number,
            default: 1
        },
        steps: [checkoutStepSchema],
        pdfPath: {
            type: String
        },
        pdfS3Url: {
            type: String
        },
        pdfS3Key: {
            type: String
        },
        pdfGeneratedAt: {
            type: Date
        },
        reportEmailSent: {
            type: Boolean,
            default: false
        },
    },
    { timestamps: true }
);

// Indexes
checkoutProcessSchema.index({ companyId: 1, userId: 1 });
checkoutProcessSchema.index({ status: 1 });

export default mongoose.model<ICheckoutProcess>('CheckoutProcess', checkoutProcessSchema);
