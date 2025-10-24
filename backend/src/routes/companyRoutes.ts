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

<<<<<<< HEAD
router.get('/dashboard', getDashboard);
router.get('/users', getAllUsers);
router.post('/users', createUser);
router.put('/users/:id', updateUser);
router.delete('/users/:id', deleteUser);
router.put('/users/:id/permissions', updatePermissions);
router.put('/users/:id/status', updateUserStatus); 
router.get('/folders', getFolders);
// New routes for hierarchical data
=======
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
>>>>>>> c3b7dd8a4d779e125bc8e003440f7824f12653cc
router.get('/organizations', getOrganizations);
router.get('/organizations/:organizationId/collections',  getCollections);
router.get('/organizations/:organizationId/folders',  getFolders);

export default router;