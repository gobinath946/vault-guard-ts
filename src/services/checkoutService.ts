import { api } from '@/lib/api';

export interface CheckoutStep {
    stepIndex: number;
    title: string;
    status: 'Pending' | 'Completed';
    completedBy?: string;
    completedAt?: string;
    data?: any;
}

export interface CheckoutProcess {
    _id: string;
    companyId: string;
    userId: any; // Can be object with details
    status: 'Initiated' | 'In Progress' | 'Completed' | 'Failed';
    currentStep: number;
    steps: CheckoutStep[];
    pdfPath?: string;
    pdfS3Url?: string; // S3 URL for the generated PDF
    reportEmailSent: boolean;
    createdAt: string;
    updatedAt: string;
}

export const checkoutService = {
    getCheckouts: async (page = 1, limit = 10, q = '', status = ''): Promise<any> => {
        const params = new URLSearchParams();
        params.append('page', page.toString());
        params.append('limit', limit.toString());
        if (q && q.trim()) params.append('q', q.trim());
        if (status && status !== 'ALL') params.append('status', status);

        const response = await api.get(`/checkout/list?${params.toString()}`);
        return response.data;
    },

    getCheckoutDetails: async (checkoutId: string): Promise<{ checkout: CheckoutProcess; assets: any }> => {
        try {
            const response = await api.get(`/checkout/${checkoutId}`);
            if (!response.data) {
                throw new Error('No data received from checkout API');
            }
            return response.data;
        } catch (error: any) {
            console.error('Checkout API Error:', error.response?.status, error.response?.data, error.message);
            throw error;
        }
    },

    initiateCheckout: async (userId: string): Promise<CheckoutProcess> => {
        const response = await api.post('/checkout/initiate', { userId });
        return response.data;
    },

    updateStep: async (checkoutId: string, stepIndex: number, status: string, data?: any): Promise<CheckoutProcess> => {
        const response = await api.put(`/checkout/${checkoutId}/step`, { stepIndex, status, data });
        return response.data;
    },

    proceedCheckout: async (checkoutId: string, emailConfig?: any): Promise<{ checkout: CheckoutProcess; emailSent: boolean; pdfGenerated: boolean; pdfPath?: string; message?: string; warnings?: string[] }> => {
        const response = await api.post(`/checkout/${checkoutId}/proceed`, { emailConfig });
        return response.data;
    },

    resendEmail: async (checkoutId: string, emailConfig: any): Promise<{ message: string; emailSent: boolean }> => {
        const response = await api.post(`/checkout/${checkoutId}/resend-email`, { emailConfig });
        return response.data;
    },

    generatePreviewPDF: async (checkoutId: string): Promise<{ pdfPath: string; message: string; cached?: boolean }> => {
        const response = await api.get(`/checkout/${checkoutId}/preview-pdf`);
        return response.data;
    },
};
