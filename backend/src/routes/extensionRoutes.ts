import express from 'express';
import { authenticate } from '../middleware/auth';
import { getPasswordsByDomain, getPasswordById, quickAddPassword } from '../controllers/extensionController';

const router = express.Router();

router.use(authenticate);

router.get('/by-domain', getPasswordsByDomain);
router.get('/password/:id', getPasswordById);
router.post('/quick-add', quickAddPassword);

export default router;


