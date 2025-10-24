import { api } from '@/lib/api';

export interface User {
  _id: string;
  username: string;
  email: string;
  role: string;
  isActive: boolean;
  createdAt: string;
  permissions?: {
    organizations: any[];
    collections: any[];
    folders: any[];
  };
}

export interface Organization {
  _id: string;
  name: string;
  description?: string;
}

export interface Collection {
  _id: string;
  name: string;
  description?: string;
  organizationId: string;
}

export interface Folder {
  _id: string;
  name: string;
  description?: string;
  collectionId: string;
  organizationId: string;
}

export interface DashboardStats {
  totalUsers: number;
  activeUsers: number;
  inactiveUsers: number;
  totalPasswords: number;
  totalCollections: number;
  totalFolders: number;
  totalOrganizations: number;
  passwordGrowth: { date: string; count: number }[];
  userActivity: { date: string; activeUsers: number; newUsers: number }[];
  categoryDistribution: { name: string; value: number; color: string }[];
}

export interface QuickStats {
  totalUsers: number;
  activeUsers: number;
  inactiveUsers: number;
  totalPasswords: number;
  totalCollections: number;
  totalFolders: number;
  totalOrganizations: number;
  recentPasswords: number;
  recentUsers: number;
  passwordPerUser: string;
  activeUserRate: string;
}

export interface UserFormData {
  username: string;
  email: string;
  password: string;
  permissions: {
    organizations: string[];
    collections: string[];
    folders: string[];
  };
}

export interface UpdateUserData {
  username?: string;
  email?: string;
  password?: string;
  permissions?: {
    organizations: string[];
    collections: string[];
    folders: string[];
  };
}

export const companyService = {
  // Dashboard methods
  getDashboard: async (): Promise<{
    totalUsers: number;
    activeUsers: number;
    inactiveUsers: number;
    totalPasswords: number;
  }> => {
    const response = await api.get('/company/dashboard');
    return response.data;
  },

  getEnhancedDashboard: async (): Promise<DashboardStats> => {
    const response = await api.get('/company/dashboard/enhanced');
    return response.data;
  },

  getDashboardStats: async (): Promise<QuickStats> => {
    const response = await api.get('/company/dashboard/stats');
    return response.data;
  },

  // User management methods
  getUsers: async (page = 1, limit = 10, q = ''): Promise<{ users: User[]; total: number }> => {
    const response = await api.get('/company/users', {
      params: { page, limit, q }
    });
    return response.data;
  },

  createUser: async (userData: UserFormData): Promise<User> => {
    const response = await api.post('/company/users', userData);
    return response.data;
  },

  updateUser: async (userId: string, userData: UpdateUserData): Promise<User> => {
    const response = await api.put(`/company/users/${userId}`, userData);
    return response.data;
  },

  updateUserStatus: async (userId: string, isActive: boolean): Promise<User> => {
    const response = await api.patch(`/company/users/${userId}/status`, { isActive });
    return response.data;
  },

  deleteUser: async (userId: string): Promise<{ message: string }> => {
    const response = await api.delete(`/company/users/${userId}`);
    return response.data;
  },

  updateUserPermissions: async (userId: string, permissions: any): Promise<User> => {
    const response = await api.patch(`/company/users/${userId}/permissions`, { permissions });
    return response.data;
  },

  getUserById: async (userId: string): Promise<User> => {
    const response = await api.get(`/company/users/${userId}`);
    return response.data;
  },

  // Hierarchical data methods
  getOrganizations: async (page = 1, limit = 50, q = ''): Promise<{ organizations: Organization[]; total: number }> => {
    const response = await api.get('/company/organizations', {
      params: { page, limit, q }
    });
    return response.data;
  },

  getCollections: async (organizationId: string, page = 1, limit = 50, q = ''): Promise<{ collections: Collection[]; total: number }> => {
    const response = await api.get(`/company/organizations/${organizationId}/collections`, {
      params: { page, limit, q }
    });
    return response.data;
  },

<<<<<<< HEAD
  // Updated getFolders to accept multiple organization IDs
  getFolders: async (organizationIds: string | string[], collectionIds: string[], page = 1, limit = 50, q = '') => {
    const params = new URLSearchParams();
    params.append('page', String(page));
    params.append('limit', String(limit));
    
    // Handle both single organization ID and array of organization IDs
    if (Array.isArray(organizationIds)) {
      params.append('organizationIds', organizationIds.join(','));
    } else {
      params.append('organizationIds', organizationIds);
    }
    
    if (Array.isArray(collectionIds) && collectionIds.length > 0) {
      params.append('collectionIds', collectionIds.join(','));
    }
    
    if (q) params.append('q', q);

    const response = await api.get(`/company/folders?${params.toString()}`);
=======
  getFolders: async (organizationId: string, collectionIds: string[] = [], page = 1, limit = 50, q = ''): Promise<{ folders: Folder[]; total: number }> => {
    const response = await api.get(`/company/organizations/${organizationId}/folders`, {
      params: { 
        collectionIds: collectionIds.join(','), 
        page, 
        limit, 
        q 
      }
    });
>>>>>>> c3b7dd8a4d779e125bc8e003440f7824f12653cc
    return response.data;
  },

  // Organization management
  createOrganization: async (organizationData: { organizationName: string; organizationEmail: string }): Promise<Organization> => {
    const response = await api.post('/company/organizations', organizationData);
    return response.data;
  },

  updateOrganization: async (organizationId: string, organizationData: { organizationName: string; organizationEmail: string }): Promise<Organization> => {
    const response = await api.put(`/company/organizations/${organizationId}`, organizationData);
    return response.data;
  },

  deleteOrganization: async (organizationId: string): Promise<{ message: string }> => {
    const response = await api.delete(`/company/organizations/${organizationId}`);
    return response.data;
  },

  // Collection management
  createCollection: async (collectionData: { collectionName: string; description: string; organizationId?: string }): Promise<Collection> => {
    const response = await api.post('/company/collections', collectionData);
    return response.data;
  },

  updateCollection: async (collectionId: string, collectionData: { collectionName: string; description: string; organizationId?: string }): Promise<Collection> => {
    const response = await api.put(`/company/collections/${collectionId}`, collectionData);
    return response.data;
  },

  deleteCollection: async (collectionId: string): Promise<{ message: string }> => {
    const response = await api.delete(`/company/collections/${collectionId}`);
    return response.data;
  },

  // Folder management
  createFolder: async (folderData: { folderName: string; organizationId: string; collectionId: string }): Promise<Folder> => {
    const response = await api.post('/company/folders', folderData);
    return response.data;
  },

  updateFolder: async (folderId: string, folderData: { folderName: string; organizationId: string; collectionId: string }): Promise<Folder> => {
    const response = await api.put(`/company/folders/${folderId}`, folderData);
    return response.data;
  },

  deleteFolder: async (folderId: string): Promise<{ message: string }> => {
    const response = await api.delete(`/company/folders/${folderId}`);
    return response.data;
  },

  // Bulk operations
  bulkUpdateUserPermissions: async (userIds: string[], permissions: any): Promise<User[]> => {
    const response = await api.post('/company/users/bulk/permissions', { userIds, permissions });
    return response.data;
  },

  exportUsers: async (): Promise<Blob> => {
    const response = await api.get('/company/users/export', {
      responseType: 'blob'
    });
    return response.data;
  },

  // Search and filter
  searchUsers: async (query: string, page = 1, limit = 20): Promise<{ users: User[]; total: number }> => {
    const response = await api.get('/company/users/search', {
      params: { q: query, page, limit }
    });
    return response.data;
  },

  // Analytics
  getUserActivity: async (days = 30): Promise<{ date: string; activeUsers: number; newUsers: number }[]> => {
    const response = await api.get('/company/analytics/user-activity', {
      params: { days }
    });
    return response.data;
  },

  getPasswordStats: async (): Promise<{
    total: number;
    byCategory: { category: string; count: number }[];
    recentAdditions: number;
  }> => {
    const response = await api.get('/company/analytics/password-stats');
    return response.data;
  }
};


