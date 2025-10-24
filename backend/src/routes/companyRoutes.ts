import express from 'express';
import {
  getDashboard,
  getAllUsers,
  createUser,
  updateUser,
  deleteUser,
  updatePermissions,
  getOrganizations,
  getCollections,
  getFolders,
  updateUserStatus,
} from '../controllers/companyController';
import { authenticate, authorize } from '../middleware/auth';

const router = express.Router();

router.use(authenticate);
router.use(authorize('company_super_admin'));

router.get('/dashboard', getDashboard);
router.get('/users', getAllUsers);
router.post('/users', createUser);
router.put('/users/:id', updateUser);
router.delete('/users/:id', deleteUser);
router.put('/users/:id/permissions', updatePermissions);
router.put('/users/:id/status', updateUserStatus); 
router.get('/folders', getFolders);
// New routes for hierarchical data
router.get('/organizations', getOrganizations);
router.get('/organizations/:organizationId/collections', getCollections);
router.get('/organizations/:organizationId/folders', getFolders);

export default router;