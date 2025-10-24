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
  getDashboardStats
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

export default router;