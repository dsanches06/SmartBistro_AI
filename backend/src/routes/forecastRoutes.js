import { Router } from 'express';
import { getForecast, generateWeeklyForecast, getWeeklyForecasts } from '../controllers/forecastController.js';
import { verifyToken } from '../middlewares/authMiddleware.js';

const router = Router();

// GET  /forecast?days=30     — previsão ad-hoc (legacy, mantido para compatibilidade)
router.get('/',        verifyToken, getForecast);
// GET  /forecast/weekly      — lista todas as previsões semanais guardadas na BD
router.get('/weekly',  verifyToken, getWeeklyForecasts);
// POST /forecast/weekly      — gera previsão para próxima semana com IA e guarda na BD
router.post('/weekly', verifyToken, generateWeeklyForecast);

export default router;
