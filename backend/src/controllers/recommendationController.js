import { getActiveMenuItems, getUserOrderHistory, getPopularItems } from '../services/index.js';
import { AnalyticsAgent } from '../genai/agents/index.js';

// GET /recommendations
// Recomendações personalizadas para utilizador autenticado.
// userId vem do JWT (req.user.id), não do query param.
export async function getRecommendations(req, res) {
  const userId = req.user?.id;

  if (!userId) {
    return res.status(401).json({ message: 'Autenticação obrigatória.' });
  }

  try {
    // Queries em paralelo via service layer
    const [menuItems, popular, userHistory] = await Promise.all([
      getActiveMenuItems(),
      getPopularItems(),
      getUserOrderHistory(userId),
    ]);

    // cacheKey = total de pedidos do utilizador (muda ao fazer novo pedido)
    const cacheKey = userHistory.reduce((sum, h) => sum + Number(h.times), 0);

    // Um único request ao AnalyticsAgent (sem pipeline, sem tools)
    const agent           = new AnalyticsAgent();
    const recommendations = await agent.recommend({ menuItems, userHistory, popular, userId });

    return res.json({ recommendations, cacheKey });
  } catch (err) {
    console.error('[Recommendations]', err.message);
    return res.status(500).json({ message: 'Erro ao gerar recomendações.' });
  }
}
