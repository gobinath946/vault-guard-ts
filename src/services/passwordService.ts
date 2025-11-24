import { api } from '@/lib/api';

export interface Password {
  _id: string;
  itemName: string;
  username: string;
  password: string;
  websiteUrls: string[];
  notes: string;
  folderId?: string;
  collectionId?: string;
  organizationId?: string;
  createdAt: string;
  updatedAt: string;
  lastModified: string;
}

export interface PasswordGeneratorOptions {
  length: number;
  uppercase: boolean;
  lowercase: boolean;
  numbers: boolean;
  special: boolean;
  minNumbers: number;
  minSpecial: number;
  avoidAmbiguous: boolean;
}

export const passwordService = {
  getAll: async (
    page = 1,
    limit = 10,
    organizationId: string = '',
    collectionIds: string[] = [],
    folderIds: string[] = []
  ) => {
    const params: any = { page, limit };
    if (organizationId) {
      params.organizationId = organizationId;
    }
    if (collectionIds.length > 0) {
      params.collectionIds = collectionIds.join(',');
    }
    if (folderIds.length > 0) {
      params.folderIds = folderIds.join(',');
    }
    const response = await api.get('/passwords', { params });
    return response.data;
  },

  getById: async (id: string) => {
    const response = await api.get(`/passwords/${id}`);
    return response.data;
  },

  create: async (data: Partial<Password>) => {
    const response = await api.post('/passwords', data);
    return response.data;
  },

  update: async (id: string, data: Partial<Password>) => {
    const response = await api.put(`/passwords/${id}`, data);
    return response.data;
  },

  delete: async (id: string) => {
    const response = await api.delete(`/passwords/${id}`);
    return response.data;
  },

  generate: async (options: PasswordGeneratorOptions) => {
    const response = await api.post('/passwords/generate', options);
    return response.data;
  },

  bulkCreate: async (passwords: Partial<Password>[]) => {
    const response = await api.post('/passwords/bulk-create', { passwords });
    return response.data;
  },

  bulkMove: async (passwordIds: string[], collectionId?: string, folderId?: string) => {
    const response = await api.post('/passwords/bulk-move', {
      passwordIds,
      collectionId,
      folderId,
    });
    return response.data;
  },
};
