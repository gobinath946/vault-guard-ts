import express from 'express';
import {
  getAllPasswords,
  getPasswordById,
  createPassword,
  updatePassword,
  softDeletePassword,
  generatePasswordHandler,
} from '../controllers/passwordController';
import { authenticate } from '../middleware/auth';

const router = express.Router();

router.use(authenticate);

router.get('/', getAllPasswords);
router.get('/:id', getPasswordById);
router.post('/', createPassword);
router.put('/:id', updatePassword);
router.delete('/:id', softDeletePassword);
router.post('/generate', generatePasswordHandler);

export default router;