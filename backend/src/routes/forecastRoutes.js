import { Router } from 'express';
import { getForecast } from '../controllers/forecastController.js';
import { verifyToken } from '../middlewares/authMiddleware.js';

const router = Router();

// GET /forecast?days=30  — requer autenticação (só staff vê previsões)
router.get('/', verifyToken, getForecast);

export default router;
