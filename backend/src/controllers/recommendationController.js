import { db } from '../db.js';
import { AnalyticsAgent } from '../genai/agents/index.js';

// GET /recommendations?userId=X
// Recolhe dados SQL em paralelo e delega ao AnalyticsAgent num único request Groq.
export async function getRecommendations(req, res) {
  const userId = req.query.userId ? parseInt(req.query.userId) : null;

  try {
    // Queries SQL em paralelo para minimizar latência
    const [menuResult, popularResult, histResult] = await Promise.all([
      db.query('SELECT id, name, category FROM items WHERE is_active = 1 ORDER BY category LIMIT 30'),
      db.query(`SELECT oi.item_id, COUNT(*) AS orders
                FROM order_items oi
                JOIN orders o ON o.id = oi.order_id
                WHERE o.created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)
                GROUP BY oi.item_id ORDER BY orders DESC LIMIT 6`),
      userId
        ? db.query(`SELECT oi.item_id, COUNT(*) AS times
                    FROM order_items oi
                    JOIN orders o ON o.id = oi.order_id
                    WHERE o.user_id = ?
                    GROUP BY oi.item_id ORDER BY times DESC LIMIT 10`, [userId])
        : Promise.resolve([[]])
    ]);

    const menuItems   = menuResult[0];
    const popular     = popularResult[0];
    const userHistory = histResult[0];

    // cacheKey = total de linhas no histórico do utilizador (muda quando faz novo pedido)
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
