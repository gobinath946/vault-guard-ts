import { api } from '@/lib/api';

export interface PrivacyPolicy {
  _id?: string;
  title: string;
  content: string;
  lastUpdated: string;
  version: number;
  isActive?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export const privacyPolicyService = {
  // Public endpoint - no auth required (only GET API)
  getPublic: async (): Promise<PrivacyPolicy> => {
    const response = await api.get('/privacy-policy/public');
    return response.data;
  },
};

