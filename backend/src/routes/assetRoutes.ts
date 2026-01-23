import express from 'express';
import { authenticate, authorize } from '../middleware/auth';
import {
  // Dashboard
  getDashboard,
  
  // Hardware Assets
  getHardwareAssets,
  createHardwareAsset,
  updateHardwareAsset,
  deleteHardwareAsset,
  
  // Hardware Allocations
  getHardwareAllocations,
  createHardwareAllocation,
  createHardwareAllocationBulk,
  updateHardwareAllocation,
  deleteHardwareAllocation,
  
  // Software Assets
  getSoftwareAssets,
  getSoftwareAsset,
  createSoftwareAsset,
  updateSoftwareAsset,
  deleteSoftwareAsset,
  
  // Software Allocations
  getSoftwareAllocations,
  createSoftwareAllocation,
  updateSoftwareAllocation,
  deleteSoftwareAllocation,
  getSoftwareAllocationCredentials,
  
  // Asset Checker
  getAssetChecker,
  
  // Utility endpoints
  getAvailableHardware,
  getAvailableSoftware,
  getCompanyUsers,
  checkExpiredSoftware,
  
  // Log endpoints
  getHardwareAssetLogs,
  getSoftwareAssetLogs,
  getHardwareAllocationLogs,
  getSoftwareAllocationLogs,
  getHardwareAssetAllocationHistory,
  getSoftwareAssetAllocationHistory,
  getUserHardwareAllocationHistory,
  getUserSoftwareAllocationHistory,
  
  // Hardware Allocation Email Requests
  createHardwareAllocationEmailRequest,
  processAllocationEmailApproval,
  getAllocationRequests,
  approveAllocationViaLink,
  rejectAllocationViaLink,
  
  // Software Allocation Email Requests
  createSoftwareAllocationEmailRequest,
  
  // Company User Endpoints
  getUserAllocatedHardware,
  getUserAllocatedSoftware,
  getUserAllocatedAssetsDashboard,
} from '../controllers/assetController';

const router = express.Router();

// Public routes (no authentication required) - for email link clicks
router.get('/hardware/allocation-request/approve/:requestId', approveAllocationViaLink);
router.get('/hardware/allocation-request/reject/:requestId', rejectAllocationViaLink);
router.get('/software/allocation-request/approve/:requestId', approveAllocationViaLink);
router.get('/software/allocation-request/reject/:requestId', rejectAllocationViaLink);

// Company User Routes (requires authentication but not super_admin role)
router.get('/user/allocated-hardware', authenticate, getUserAllocatedHardware);
router.get('/user/allocated-software', authenticate, getUserAllocatedSoftware);
router.get('/user/allocated-dashboard', authenticate, getUserAllocatedAssetsDashboard);

// All other routes require authentication and Super Admin role
router.use(authenticate);
router.use(authorize('company_super_admin'));

// Dashboard
router.get('/dashboard', getDashboard);

// Utility endpoints (must come before parameterized routes)
router.get('/hardware/available', getAvailableHardware);
router.get('/software/available', getAvailableSoftware);
router.get('/users', getCompanyUsers);
router.post('/software/check-expired', checkExpiredSoftware);

// Hardware Assets
router.get('/hardware', getHardwareAssets);
router.post('/hardware', createHardwareAsset);

// Hardware Allocations (must come before :assetId routes)
router.get('/hardware/allocations', getHardwareAllocations);
router.post('/hardware/assign', createHardwareAllocation);
router.post('/hardware/assign-bulk', createHardwareAllocationBulk);
router.put('/hardware/allocations/:allocationId', updateHardwareAllocation);
router.delete('/hardware/allocations/:allocationId', deleteHardwareAllocation);
router.get('/hardware/allocations/:allocationId/logs', getHardwareAllocationLogs);

// Hardware Assets with parameters (must come after specific routes)
router.put('/hardware/:assetId', updateHardwareAsset);
router.delete('/hardware/:assetId', deleteHardwareAsset);
router.get('/hardware/:assetId/logs', getHardwareAssetLogs);
router.get('/hardware/:assetId/allocation-history', getHardwareAssetAllocationHistory);

// Software Assets
router.get('/software', getSoftwareAssets);
router.post('/software', createSoftwareAsset);

// Software Allocations (must come before :assetId routes)
router.get('/software/allocations', getSoftwareAllocations);
router.post('/software/assign', createSoftwareAllocation);
router.get('/software/allocations/:allocationId/credentials', getSoftwareAllocationCredentials);
router.put('/software/allocations/:allocationId', updateSoftwareAllocation);
router.delete('/software/allocations/:allocationId', deleteSoftwareAllocation);
router.get('/software/allocations/:allocationId/logs', getSoftwareAllocationLogs);

// Software Assets with parameters (must come after specific routes)
router.get('/software/:assetId', getSoftwareAsset);
router.put('/software/:assetId', updateSoftwareAsset);
router.delete('/software/:assetId', deleteSoftwareAsset);
router.get('/software/:assetId/logs', getSoftwareAssetLogs);
router.get('/software/:assetId/allocation-history', getSoftwareAssetAllocationHistory);

// Asset Checker
router.get('/checker/:userId', getAssetChecker);

// User allocation history
router.get('/hardware/user/:userId/allocation-history', getUserHardwareAllocationHistory);
router.get('/software/user/:userId/allocation-history', getUserSoftwareAllocationHistory);

// Hardware Allocation Email Requests
router.post('/hardware/allocation-request', createHardwareAllocationEmailRequest);
router.post('/hardware/allocation-request/process', processAllocationEmailApproval);
router.get('/hardware/allocation-requests', getAllocationRequests);

// Software Allocation Email Requests
router.post('/software/allocation-request', createSoftwareAllocationEmailRequest);

export default router;