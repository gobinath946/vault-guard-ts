import express from 'express';
import {
  getDashboard,
  getAllUsers,
  createUser,
  updateUser,
  deleteUser,
  updatePermissions,
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

export default router;
