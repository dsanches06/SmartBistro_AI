import { Router } from 'express';
import { verifyToken } from '../middlewares/authMiddleware.js';
import { getRecommendations } from '../controllers/recommendationController.js';

const router = Router();

// GET /recommendations — autenticado obrigatório (userId vem do JWT)
router.get('/', verifyToken, getRecommendations);

export default router;
