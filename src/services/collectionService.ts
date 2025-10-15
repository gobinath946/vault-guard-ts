import { api } from '@/lib/api';

export interface Collection {
  _id: string;
  collectionName: string;
  description: string;
  passwords: string[];
  companyId: string;
  createdBy: string;
  sharedWith: string[];
  createdAt: string;
  updatedAt: string;
}

export const collectionService = {
  getAll: async () => {
    const response = await api.get('/collections');
    return response.data;
  },

  getById: async (id: string) => {
    const response = await api.get(`/collections/${id}`);
    return response.data;
  },

  create: async (data: Partial<Collection>) => {
    const response = await api.post('/collections', data);
    return response.data;
  },

  update: async (id: string, data: Partial<Collection>) => {
    const response = await api.put(`/collections/${id}`, data);
    return response.data;
  },

  delete: async (id: string) => {
    const response = await api.delete(`/collections/${id}`);
    return response.data;
  },
};
