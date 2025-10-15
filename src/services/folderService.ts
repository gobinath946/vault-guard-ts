import { api } from '@/lib/api';

export interface Folder {
  _id: string;
  folderName: string;
  parentFolderId?: string;
  companyId: string;
  createdBy: string;
  sharedWith: string[];
  createdAt: string;
  updatedAt: string;
}

export const folderService = {
  getAll: async () => {
    const response = await api.get('/folders');
    return response.data;
  },

  getById: async (id: string) => {
    const response = await api.get(`/folders/${id}`);
    return response.data;
  },

  create: async (data: Partial<Folder>) => {
    const response = await api.post('/folders', data);
    return response.data;
  },

  update: async (id: string, data: Partial<Folder>) => {
    const response = await api.put(`/folders/${id}`, data);
    return response.data;
  },

  delete: async (id: string) => {
    const response = await api.delete(`/folders/${id}`);
    return response.data;
  },
};
