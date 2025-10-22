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
  getAll: async (page = 1, limit = 10) => {
    const response = await api.get(`/passwords?page=${page}&limit=${limit}`);
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
};
