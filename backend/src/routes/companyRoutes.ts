// routes/companyRoutes.ts
import express from 'express';
import {
  getDashboard,
  getEnhancedDashboard,
  getAllUsers,
  createUser,
  updateUser,
  updateUserStatus,
  deleteUser,
  updatePermissions,
  getOrganizations,
  getCollections,
  getFolders,
  getDashboardStats,
  getS3Config,
  updateS3Config,
  getS3ConfigForUpload
} from '../controllers/companyController';
import { authenticate } from '../middleware/auth';

const router = express.Router();

router.use(authenticate);

// Dashboard routes
router.get('/dashboard',  getDashboard);
router.get('/dashboard/enhanced', getEnhancedDashboard);
router.get('/dashboard/stats',  getDashboardStats);

// User management routes
router.get('/users',getAllUsers);
router.post('/users',createUser);
router.put('/users/:id',updateUser);
router.patch('/users/:id/status',updateUserStatus);
router.delete('/users/:id',  deleteUser);
router.patch('/users/:id/permissions',updatePermissions);

// Hierarchical data routes
router.get('/organizations', getOrganizations);
router.get('/organizations/:organizationId/collections',  getCollections);
router.get('/organizations/:organizationId/folders',  getFolders);

// S3 Configuration routes
router.get('/s3-config', getS3Config);
router.put('/s3-config', updateS3Config);
router.get('/s3-config/upload', getS3ConfigForUpload);

export default router;