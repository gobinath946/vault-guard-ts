import { api } from '@/lib/api';

export interface Company {
  _id: string;
  companyName: string;
  email: string;
  contactName: string;
  phoneNumber: string;
  city: string;
  state: string;
  pinCode: string;
  country: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface DashboardStats {
  totalUsers: number;
  activeUsers: number;
  inactiveUsers: number;
  totalPasswords: number;
}

export const companyService = {
  getDashboard: async () => {
    const response = await api.get('/company/dashboard');
    return response.data;
  },

  getUsers: async (page = 1, limit = 10, q = '') => {
    const params = new URLSearchParams();
    params.append('page', String(page));
    params.append('limit', String(limit));
    if (q) params.append('q', q);
    const response = await api.get(`/company/users?${params.toString()}`);
    return response.data;
  },

  createUser: async (userData: any) => {
    const response = await api.post('/company/users', userData);
    return response.data;
  },

  updateUser: async (id: string, userData: any) => {
    const response = await api.put(`/company/users/${id}`, userData);
    return response.data;
  },

  deleteUser: async (id: string) => {
    const response = await api.delete(`/company/users/${id}`);
    return response.data;
  },

  updatePermissions: async (id: string, permissions: any) => {
    const response = await api.put(`/company/users/${id}/permissions`, permissions);
    return response.data;
  },
};
