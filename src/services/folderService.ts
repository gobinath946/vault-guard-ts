import { api } from '@/lib/api';

export interface Folder {
  _id: string;
  folderName: string;
  parentFolderId?: string;
  organizationId?: string;
  collectionId?: string;
  companyId: string;
  createdBy: string;
  sharedWith: string[];
  createdAt: string;
  updatedAt: string;
}

export const folderService = {
  getAll: async (page = 1, limit = 20, q = '', organizationId?: string, collectionId?: string) => {
    const params = new URLSearchParams();
    params.append('page', String(page));
    params.append('limit', String(limit));
    if (q) params.append('q', q);
    if (organizationId) params.append('organizationId', organizationId);
    if (collectionId) params.append('collectionId', collectionId);
    const response = await api.get(`/folders?${params.toString()}`);
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
