import express from 'express';
import {
  getAllOrganizations,
  getOrganizationById,
  createOrganization,
  updateOrganization,
  softDeleteOrganization,
} from '../controllers/organizationController';
import { authenticate } from '../middleware/auth';

const router = express.Router();

router.use(authenticate);

router.get('/', getAllOrganizations);
router.get('/:id', getOrganizationById);
router.post('/', createOrganization);
router.put('/:id', updateOrganization);
router.delete('/:id', softDeleteOrganization);

export default router;