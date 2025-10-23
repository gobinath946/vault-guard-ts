import { api } from '@/lib/api';

export interface TrashItem {
  _id: string;
  itemId: string;
  itemType: 'collection' | 'folder' | 'organization' | 'password';
  itemName: string;
  originalData: any;
  deletedBy: {
    _id: string;
    name: string;
    email: string;
  };
  deletedFrom: string;
  deletedAt: string;
  isRestored: boolean;
  restoredAt?: string;
  restoredBy?: {
    _id: string;
    name: string;
    email: string;
  };
}

interface TrashResponse {
  trashItems: TrashItem[];
  total: number;
  page: number;
  totalPages: number;
}

export const trashService = {
  async getAll(page: number = 1, limit: number = 20): Promise<TrashResponse> {
    const response = await api.get(`/trash?page=${page}&limit=${limit}`);
    return response.data;
  },

  async getById(id: string): Promise<TrashItem> {
    const response = await api.get(`/trash/${id}`);
    return response.data;
  },

  async restore(id: string): Promise<{ message: string; restoredItem: any; trashItem: TrashItem }> {
    const response = await api.post(`/trash/${id}/restore`);
    return response.data;
  },

  async permanentDelete(id: string): Promise<{ message: string }> {
    const response = await api.delete(`/trash/${id}`);
    return response.data;
  },

  async emptyTrash(): Promise<{ message: string; deletedCount: number }> {
    const response = await api.delete('/trash');
    return response.data;
  },
};