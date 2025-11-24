import express from 'express';
import {
  getAllPasswords,
  getPasswordById,
  createPassword,
  updatePassword,
  softDeletePassword,
  generatePasswordHandler,
  bulkCreatePasswords,
  bulkMovePasswords,
} from '../controllers/passwordController';
import { authenticate } from '../middleware/auth';

const router = express.Router();

router.use(authenticate);

router.get('/', getAllPasswords);
router.get('/:id', getPasswordById);
router.post('/', createPassword);
router.post('/bulk-create', bulkCreatePasswords);
router.post('/bulk-move', bulkMovePasswords);
router.put('/:id', updatePassword);
router.delete('/:id', softDeletePassword);
router.post('/generate', generatePasswordHandler);

export default router;