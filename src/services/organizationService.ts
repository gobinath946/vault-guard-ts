import { api } from '@/lib/api';

export interface Organization {
  _id: string;
  organizationName: string;
  organizationEmail: string;
  createdAt: string;
  updatedAt: string;
}

export const organizationService = {
  getAll: async (page = 1, limit = 20, q = ''): Promise<any> => {
    const params = new URLSearchParams();
    if (page) params.append('page', String(page));
    if (limit) params.append('limit', String(limit));
    if (q) params.append('q', q);
    const response = await api.get(`/organizations?${params.toString()}`);
    return response.data;
  },

  getById: async (id: string): Promise<Organization> => {
    const response = await api.get(`/organizations/${id}`);
    return response.data;
  },

  create: async (data: { organizationName: string; organizationEmail: string }): Promise<Organization> => {
    const response = await api.post('/organizations', data);
    return response.data;
  },

  update: async (id: string, data: { organizationName: string; organizationEmail: string }): Promise<Organization> => {
    const response = await api.put(`/organizations/${id}`, data);
    return response.data;
  },

  delete: async (id: string): Promise<void> => {
    await api.delete(`/organizations/${id}`);
  },
};