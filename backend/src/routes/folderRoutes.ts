import express from 'express';
import {
  getAllFolders,
  getFolderById,
  createFolder,
  updateFolder,
  softDeleteFolder,
} from '../controllers/folderController';
import { authenticate } from '../middleware/auth';

const router = express.Router();

router.use(authenticate);

router.get('/', getAllFolders);
router.get('/:id', getFolderById);
router.post('/', createFolder);
router.put('/:id', updateFolder);
router.delete('/:id', softDeleteFolder);

export default router;