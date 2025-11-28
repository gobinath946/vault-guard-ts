import { api } from '@/lib/api';

export interface AuditLog {
  _id: string;
  userId: string;
  userEmail: string;
  userName: string;
  userRole: string;
  companyId: string;
  action: 'login' | 'view_username' | 'copy_username' | 'view_password' | 'copy_password' | 'edit_password';
  resourceType?: 'password';
  resourceId?: string;
  resourceName?: string;
  ipAddress: string;
  location?: {
    country?: string;
    region?: string;
    city?: string;
    latitude?: number;
    longitude?: number;
  };
  userAgent?: string;
  changes?: {
    field: string;
    oldValue?: string;
    newValue?: string;
  }[];
  timestamp: string;
  metadata?: any;
}

export const auditService = {
  // Log view username action
  logViewUsername: async (passwordId: string, passwordName: string) => {
    try {
      await api.post('/passwords/audit/view-username', {
        passwordId,
        passwordName,
      });
    } catch (error) {
      console.error('Failed to log view username:', error);
    }
  },

  // Log copy username action
  logCopyUsername: async (passwordId: string, passwordName: string) => {
    try {
      await api.post('/passwords/audit/copy-username', {
        passwordId,
        passwordName,
      });
    } catch (error) {
      console.error('Failed to log copy username:', error);
    }
  },

  // Log view password action
  logViewPassword: async (passwordId: string, passwordName: string) => {
    try {
      await api.post('/passwords/audit/view-password', {
        passwordId,
        passwordName,
      });
    } catch (error) {
      console.error('Failed to log view password:', error);
    }
  },

  // Log copy password action
  logCopyPassword: async (passwordId: string, passwordName: string) => {
    try {
      await api.post('/passwords/audit/copy-password', {
        passwordId,
        passwordName,
      });
    } catch (error) {
      console.error('Failed to log copy password:', error);
    }
  },

  // Get audit logs for a specific password
  getPasswordAuditLogs: async (passwordId: string, limit: number = 100) => {
    try {
      const response = await api.get(`/passwords/${passwordId}/audit-logs`, {
        params: { limit },
      });
      return response.data.auditLogs || [];
    } catch (error) {
      console.error('Failed to fetch audit logs:', error);
      return [];
    }
  },
};
