import { Router } from 'express';
import { getRecommendations } from '../controllers/recommendationController.js';

const router = Router();

// GET /recommendations?userId=X  — público, userId opcional
router.get('/', getRecommendations);

export default router;
