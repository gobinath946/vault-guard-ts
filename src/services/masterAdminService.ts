import { api } from '@/lib/api';
import { Company } from './companyService';

export interface MasterDashboardStats {
  totalCompanies: number;
  activeCompanies: number;
  inactiveCompanies: number;
  totalUsers: number;
}

export const masterAdminService = {
  getDashboard: async () => {
    const response = await api.get('/master/dashboard');
    return response.data;
  },

  getAllCompanies: async () => {
    const response = await api.get('/master/companies');
    return response.data;
  },

  createCompany: async (data: Partial<Company>) => {
    const response = await api.post('/master/companies', data);
    return response.data;
  },

  updateCompany: async (id: string, data: Partial<Company>) => {
    const response = await api.put(`/master/companies/${id}`, data);
    return response.data;
  },

  deleteCompany: async (id: string) => {
    const response = await api.delete(`/master/companies/${id}`);
    return response.data;
  },

  getSettings: async () => {
    const response = await api.get('/master/settings');
    return response.data;
  },

  updateSettings: async (settings: any) => {
    const response = await api.put('/master/settings', settings);
    return response.data;
  },
};
