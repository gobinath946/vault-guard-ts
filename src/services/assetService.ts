import { api } from '@/lib/api';

// Use the shared API instance instead of creating a new one

export interface HardwareAsset {
  _id: string;
  assetName?: string;
  assetType?: string;
  brand?: string;
  assetModel?: string;
  serialNumber?: string;
  purchaseDate?: string;
  status: 'AVAILABLE' | 'ASSIGNED' | 'RETURNED' | 'DELETED';
  remarks?: string;
  createdAt: string;
  updatedAt: string;
  currentAllocation?: {
    _id: string;
    userId: {
      _id: string;
      username: string;
      email: string;
    };
    allocatedDate: string;
    remarks?: string;
  };
}

export interface HardwareAllocation {
  _id: string;
  userId: {
    _id: string;
    username: string;
    email: string;
  };
  hardwareAssetId: {
    _id: string;
    assetName: string;
    brand: string;
    assetModel: string;
    serialNumber: string;
  };
  allocatedDate: string;
  returnedDate?: string;
  status: 'ACTIVE' | 'RETURNED' | 'DELETED';
  remarks?: string;
  createdAt: string;
  allocationEventId?: string; // For grouping related allocations
}

export interface HardwareAllocationEvent {
  _id: string;
  userId: {
    _id: string;
    username: string;
    email: string;
  };
  allocatedDate: string;
  status: 'ACTIVE' | 'RETURNED' | 'DELETED';
  remarks?: string;
  assetCount: number;
  assets: {
    _id: string;
    assetName: string;
    brand: string;
    assetModel: string;
    serialNumber: string;
    allocationId: string;
  }[];
  createdAt: string;
}

export interface SoftwareAsset {
  _id: string;
  softwareName?: string;
  vendor?: string;
  customFields?: { [key: string]: any };
  totalLicenseCount?: number;
  availableLicenseCount?: number;
  startDate?: string;
  endDate?: string;
  status: 'ACTIVE' | 'ALLOCATED' | 'EXPIRED' | 'DELETED';
  createdAt: string;
  updatedAt: string;
}

export interface SoftwareAllocation {
  _id: string;
  userId: {
    _id: string;
    username: string;
    email: string;
  };
  softwareAssetId: {
    _id: string;
    softwareName: string;
    vendor: string;
    totalLicenseCount: number;
  };
  licenseCount: number;
  allocatedDate: string;
  expiryDate?: string;
  status: 'ACTIVE' | 'EXPIRED' | 'DELETED';
  remarks?: string;
  createdAt: string;
}

// Utility function to check if software allocation is expired
const checkSoftwareAllocationExpiry = (allocation: any): any => {
  if (allocation.expiryDate && allocation.status === 'ACTIVE') {
    const expiryDate = new Date(allocation.expiryDate);
    const currentDate = new Date();
    
    // Set time to match backend logic
    expiryDate.setHours(23, 59, 59, 999); // End of the expiry date
    currentDate.setHours(0, 0, 0, 0);     // Start of current date
    
    if (currentDate > expiryDate) {
      return {
        ...allocation,
        status: 'EXPIRED'
      };
    }
  }
  return allocation;
};

// Utility function to check if software asset is expired
const checkSoftwareAssetExpiry = (asset: any): any => {
  if (asset.endDate && asset.status === 'ACTIVE') {
    const endDate = new Date(asset.endDate);
    const currentDate = new Date();
    
    // Set time to start of day for accurate comparison
    endDate.setHours(0, 0, 0, 0);
    currentDate.setHours(0, 0, 0, 0);
    
    if (currentDate > endDate) {
      return {
        ...asset,
        status: 'EXPIRED'
      };
    }
  }
  return asset;
};

export interface AssetDashboard {
  hardware: {
    total: number;
    available: number;
    allocated: number;
  };
  software: {
    total: number;
    totalLicenses: number;
    availableLicenses: number;
    allocatedLicenses: number;
  };
}

export interface AssetChecker {
  user: {
    _id: string;
    username: string;
    email: string;
  };
  hardware: HardwareAllocation[];
  software: SoftwareAllocation[];
}

export interface CompanyUser {
  _id: string;
  username: string;
  email: string;
}

class AssetService {
  // Dashboard
  async getDashboard(): Promise<AssetDashboard> {
    const response = await api.get('/assets/dashboard');
    // Map backend response to frontend terminology
    const mappedData = {
      ...response.data,
      hardware: {
        ...response.data.hardware,
        allocated: response.data.hardware.assigned || response.data.hardware.allocated
      },
      software: {
        ...response.data.software,
        allocatedLicenses: response.data.software.assignedLicenses || response.data.software.allocatedLicenses
      }
    };
    return mappedData;
  }

  // Hardware Assets
  async getHardwareAssets(params?: {
    page?: number;
    limit?: number;
    q?: string;
    status?: string;
  }) {
    const response = await api.get('/assets/hardware', { params });
    // Map backend response to frontend terminology
    const mappedAssets = response.data.assets?.map((asset: any) => ({
      ...asset,
      currentAllocation: asset.currentAllocation ? {
        ...asset.currentAllocation,
        allocatedDate: asset.currentAllocation.assignedDate
      } : undefined
    })) || [];
    
    return {
      ...response.data,
      assets: mappedAssets
    };
  }

  async createHardwareAsset(data: Partial<HardwareAsset>) {
    const response = await api.post('/assets/hardware', data);
    return response.data;
  }

  async updateHardwareAsset(assetId: string, data: Partial<HardwareAsset>) {
    const response = await api.put(`/assets/hardware/${assetId}`, data);
    return response.data;
  }

  async deleteHardwareAsset(assetId: string) {
    const response = await api.delete(`/assets/hardware/${assetId}`);
    return response.data;
  }

  // Hardware Allocations
  async getHardwareAllocations(params?: {
    page?: number;
    limit?: number;
    q?: string;
  }) {
    const response = await api.get('/assets/hardware/allocations', { params });
    // Map backend response to frontend terminology
    const mappedAllocations = response.data.allocations?.map((allocation: any) => ({
      ...allocation,
      allocatedDate: allocation.assignedDate
    })) || [];
    
    return {
      ...response.data,
      allocations: mappedAllocations
    };
  }

  async createHardwareAllocationBulk(data: {
    userId: string;
    hardwareAssetIds: string[];
    remarks?: string;
  }) {
    const response = await api.post('/assets/hardware/assign-bulk', data);
    return response.data;
  }

  async createHardwareAllocation(data: {
    userId: string;
    hardwareAssetId: string;
    remarks?: string;
  }) {
    const response = await api.post('/assets/hardware/assign', data);
    return response.data;
  }

  async updateHardwareAllocation(allocationId: string, data: {
    userId?: string;
    hardwareAssetId?: string;
    remarks?: string;
  }) {
    const response = await api.put(`/assets/hardware/allocations/${allocationId}`, data);
    return response.data;
  }

  async deleteHardwareAllocation(allocationId: string) {
    const response = await api.delete(`/assets/hardware/allocations/${allocationId}`);
    return response.data;
  }

  // Software Assets
  async getSoftwareAssets(params?: {
    page?: number;
    limit?: number;
    q?: string;
    status?: string;
  }) {
    const response = await api.get('/assets/software', { params });
    // Check expiry status for each asset on the frontend as well
    const assetsWithExpiryCheck = response.data.assets?.map((asset: any) => {
      return checkSoftwareAssetExpiry(asset);
    }) || [];
    
    return {
      ...response.data,
      assets: assetsWithExpiryCheck
    };
  }

  async getSoftwareAsset(assetId: string): Promise<SoftwareAsset> {
    const response = await api.get(`/assets/software/${assetId}`);
    // Check expiry status for the individual asset
    return checkSoftwareAssetExpiry(response.data);
  }

  async createSoftwareAsset(data: Partial<SoftwareAsset>) {
    const response = await api.post('/assets/software', data);
    return response.data;
  }

  async updateSoftwareAsset(assetId: string, data: Partial<SoftwareAsset>) {
    const response = await api.put(`/assets/software/${assetId}`, data);
    return response.data;
  }

  async deleteSoftwareAsset(assetId: string) {
    const response = await api.delete(`/assets/software/${assetId}`);
    return response.data;
  }

  async getSoftwareCredentials(assetId: string) {
    const response = await api.get(`/assets/software/${assetId}/credentials`);
    return response.data;
  }

  // Software Allocations
  async getSoftwareAllocations(params?: {
    page?: number;
    limit?: number;
    q?: string;
  }) {
    const response = await api.get('/assets/software/allocations', { params });
    // Map backend response to frontend terminology and ensure status is properly handled
    const mappedAllocations = response.data.allocations?.map((allocation: any) => {
      const mappedAllocation = {
        ...allocation,
        allocatedDate: allocation.assignedDate
      };
      // Don't override backend status - trust the backend status over frontend calculations
      return mappedAllocation;
    }) || [];
    
    return {
      ...response.data,
      allocations: mappedAllocations
    };
  }

  async createSoftwareAllocation(data: {
    userId: string;
    softwareAssetId: string;
    licenseCount: number;
    expiryDate?: string;
    remarks?: string;
    credentials?: {
      username?: string;
      password?: string;
      apiKey?: string;
      licenseKey?: string;
    };
    customFields?: { [key: string]: any };
  }) {
    const response = await api.post('/assets/software/assign', data);
    return response.data;
  }

  async updateSoftwareAllocation(allocationId: string, data: {
    userId?: string;
    softwareAssetId?: string;
    licenseCount?: number;
    expiryDate?: string;
    remarks?: string;
    credentials?: {
      username?: string;
      password?: string;
      apiKey?: string;
      licenseKey?: string;
    };
    customFields?: { [key: string]: any };
  }) {
    const response = await api.put(`/assets/software/allocations/${allocationId}`, data);
    return response.data;
  }

  async deleteSoftwareAllocation(allocationId: string) {
    const response = await api.delete(`/assets/software/allocations/${allocationId}`);
    return response.data;
  }

  async getSoftwareAllocationCredentials(allocationId: string) {
    const response = await api.get(`/assets/software/allocations/${allocationId}/credentials`);
    return response.data;
  }

  // Asset Checker
  async getAssetChecker(userId: string): Promise<AssetChecker> {
    const response = await api.get(`/assets/checker/${userId}`);
    // Map backend response to frontend terminology
    const mappedData = {
      ...response.data,
      hardware: response.data.hardware?.map((allocation: any) => ({
        ...allocation,
        allocatedDate: allocation.assignedDate
      })) || [],
      software: response.data.software?.map((allocation: any) => {
        const mappedAllocation = {
          ...allocation,
          allocatedDate: allocation.assignedDate
        };
        // Don't override backend status - trust the backend status
        return mappedAllocation;
      }) || []
    };
    return mappedData;
  }

  // Utility endpoints
  async getAvailableHardware(q?: string) {
    const response = await api.get('/assets/hardware/available', { params: { q } });
    return response.data;
  }

  async getAvailableSoftware(q?: string) {
    const response = await api.get('/assets/software/available', { params: { q } });
    // Check expiry status for available software as well
    const assetsWithExpiryCheck = response.data.assets?.map((asset: any) => {
      return checkSoftwareAssetExpiry(asset);
    }) || [];
    
    return {
      ...response.data,
      assets: assetsWithExpiryCheck
    };
  }

  async getCompanyUsers(q?: string): Promise<{ users: CompanyUser[] }> {
    const response = await api.get('/assets/users', { params: { q } });
    return response.data;
  }

  // Log fetching methods
  async getHardwareAssetLogs(assetId: string): Promise<{ logs: any[] }> {
    const response = await api.get(`/assets/hardware/${assetId}/logs`);
    return response.data;
  }

  async getSoftwareAssetLogs(assetId: string): Promise<{ logs: any[] }> {
    const response = await api.get(`/assets/software/${assetId}/logs`);
    return response.data;
  }

  async getHardwareAllocationLogs(allocationId: string, statusFilter?: string): Promise<{ logs: any[] }> {
    // Always send statusFilter, even when it's 'all', so backend knows to return all logs
    const params = { statusFilter: statusFilter || 'all' };
    const response = await api.get(`/assets/hardware/allocations/${allocationId}/logs`, { params });
    return response.data;
  }

  async getSoftwareAllocationLogs(allocationId: string, statusFilter?: string): Promise<{ logs: any[] }> {
    const params = { statusFilter: statusFilter || 'all' };
    const response = await api.get(`/assets/software/allocations/${allocationId}/logs`, { params });
    return response.data;
  }

  async getHardwareAssetAllocationHistory(assetId: string, statusFilter?: string): Promise<{ logs: any[] }> {
    const params = { statusFilter: statusFilter || 'all' };
    const response = await api.get(`/assets/hardware/${assetId}/allocation-history`, { params });
    return response.data;
  }

  async getSoftwareAssetAllocationHistory(assetId: string, statusFilter?: string): Promise<{ logs: any[] }> {
    const params = { statusFilter: statusFilter || 'all' };
    const response = await api.get(`/assets/software/${assetId}/allocation-history`, { params });
    return response.data;
  }

  async getUserHardwareAllocationHistory(userId: string, statusFilter?: string): Promise<{ logs: any[] }> {
    const params = { statusFilter: statusFilter || 'all' };
    const response = await api.get(`/assets/hardware/user/${userId}/allocation-history`, { params });
    return response.data;
  }

  async getUserSoftwareAllocationHistory(userId: string, statusFilter?: string): Promise<{ logs: any[] }> {
    const params = { statusFilter: statusFilter || 'all' };
    const response = await api.get(`/assets/software/user/${userId}/allocation-history`, { params });
    return response.data;
  }
}

export const assetService = new AssetService();