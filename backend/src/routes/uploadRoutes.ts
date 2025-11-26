import express from 'express';
import { uploadFile, deleteFile } from '../controllers/uploadController';
import { authenticate } from '../middleware/auth';
import { upload } from '../middleware/upload';

const router = express.Router();

// Protect all routes with authentication
router.use(authenticate);

// Upload file
router.post('/', upload.single('file'), uploadFile);

// Delete file
router.delete('/', deleteFile);

export default router;
