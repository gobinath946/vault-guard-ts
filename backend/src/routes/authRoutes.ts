import express from 'express';
import { register, login, logout, verifyToken } from '../controllers/authController';
import { authenticate } from '../middleware/auth';

const router = express.Router();

router.post('/register', register);
router.post('/login', login);
router.post('/logout', logout);
router.get('/verify', authenticate, verifyToken);

export default router;
