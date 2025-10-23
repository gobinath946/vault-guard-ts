import express from 'express';
import {
  getAllTrashItems,
  getTrashItemById,
  restoreTrashItem,
  permanentDeleteTrashItem,
  emptyTrash,
} from '../controllers/trashController';
import { authenticate } from '../middleware/auth';

const router = express.Router();

router.use(authenticate);

router.get('/', getAllTrashItems);
router.get('/:id', getTrashItemById);
router.post('/:id/restore', restoreTrashItem);
router.delete('/:id', permanentDeleteTrashItem);
router.delete('/', emptyTrash);

export default router;