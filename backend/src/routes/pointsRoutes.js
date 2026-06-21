import { Router } from 'express';
import { getBalance, redeem } from '../controllers/pointsController.js';
import { verifyToken } from '../middlewares/authMiddleware.js';

const router = Router();

// GET /points/balance/:userId — requer autenticação
router.get('/balance/:userId', verifyToken, getBalance);

// POST /points/redeem — debita pontos e devolve desconto
router.post('/redeem', verifyToken, redeem);

export default router;
