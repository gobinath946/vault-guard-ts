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

export interface Organization {
  _id: string;
  name: string;
  description?: string;
}

export interface Collection {
  _id: string;
  name: string;
  organizationId: string;
  description?: string;
}

export interface Folder {
  _id: string;
  name: string;
  collectionId: string;
  organizationId: string;
  description?: string;
}

export interface UserPermissions {
  organizations: string[];
  collections: string[];
  folders: string[];
}

export const companyService = {
  getDashboard: async (): Promise<DashboardStats> => {
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

  createUser: async (userData: {
    username: string;
    email: string;
    password: string;
    permissions: UserPermissions;
  }) => {
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

  updatePermissions: async (id: string, permissions: UserPermissions) => {
    const response = await api.put(`/company/users/${id}/permissions`, { permissions });
    return response.data;
  },

  // Hierarchical data methods
  getOrganizations: async (page = 1, limit = 50, q = '') => {
    const params = new URLSearchParams();
    params.append('page', String(page));
    params.append('limit', String(limit));
    if (q) params.append('q', q);
    
    const response = await api.get(`/company/organizations?${params.toString()}`);
    return response.data;
  },

  getCollections: async (organizationId: string, page = 1, limit = 50, q = '') => {
    const params = new URLSearchParams();
    params.append('page', String(page));
    params.append('limit', String(limit));
    if (q) params.append('q', q);
    
    const response = await api.get(`/company/organizations/${organizationId}/collections?${params.toString()}`);
    return response.data;
  },

  getFolders: async (organizationId: string, collectionIds: string[], page = 1, limit = 50, q = '') => {
    const params = new URLSearchParams();
    params.append('page', String(page));
    params.append('limit', String(limit));
    params.append('collectionIds', collectionIds.join(','));
    if (q) params.append('q', q);
    
    const response = await api.get(`/company/organizations/${organizationId}/folders?${params.toString()}`);
    return response.data;
  },
};