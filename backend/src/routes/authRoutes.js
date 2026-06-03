import { Router } from 'express';
import { register, login, logout, requestDelete, me } from '../controllers/authController.js';
import { verifyToken } from '../middlewares/authMiddleware.js';

const router = Router();

router.post('/register', register);
router.post('/login',    login);
router.post('/logout',         verifyToken, logout);
router.post('/request-delete', verifyToken, requestDelete);
router.get('/me',              verifyToken, me);

export default router;
