import { Router } from 'express';
import { register, login, logout, requestDelete, changePassword, me, resetRequest, resetAddPhone, resetConfirm } from '../controllers/authController.js';
import { verifyToken } from '../middlewares/authMiddleware.js';

const router = Router();

router.post('/register', register);
router.post('/login',    login);
router.post('/logout',           verifyToken, logout);
router.post('/request-delete',   verifyToken, requestDelete);
router.post('/change-password',  verifyToken, changePassword);
router.get('/me',                verifyToken, me);
router.post('/reset-request',    resetRequest);
router.post('/reset-add-phone',  resetAddPhone);
router.post('/reset-confirm',    resetConfirm);

export default router;
