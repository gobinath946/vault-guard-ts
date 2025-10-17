import { api } from '@/lib/api';

export interface Organization {
  _id: string;
  organizationName: string;
  organizationEmail: string;
  createdAt: string;
  updatedAt: string;
}

export const organizationService = {
  getAll: async (): Promise<Organization[]> => {
    const response = await api.get('/organizations');
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