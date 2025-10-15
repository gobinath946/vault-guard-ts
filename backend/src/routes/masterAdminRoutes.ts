import express from 'express';
import {
  getDashboard,
  getAllCompanies,
  updateCompany,
  deleteCompany,
} from '../controllers/masterAdminController';
import { authenticate, authorize } from '../middleware/auth';

const router = express.Router();

router.use(authenticate);
router.use(authorize('master_admin'));

router.get('/dashboard', getDashboard);
router.get('/companies', getAllCompanies);
router.put('/companies/:id', updateCompany);
router.delete('/companies/:id', deleteCompany);

export default router;
