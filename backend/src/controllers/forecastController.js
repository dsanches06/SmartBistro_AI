import { getDailyRevenue } from '../services/forecastService.js';
import { AnalyticsAgent } from '../genai/agents/index.js';

// GET /forecast?days=30
// Recolhe faturação histórica e delega ao AnalyticsAgent para prever os próximos 7 dias.
export async function getForecast(req, res) {
  const days = Math.min(parseInt(req.query.days) || 30, 90);

  try {
    const dailyRevenue = await getDailyRevenue(days);

    if (dailyRevenue.length < 3)
      return res.json({ forecast: [], summary: 'Dados insuficientes para previsão.', trend: 'estável', historical: dailyRevenue });

    const agent  = new AnalyticsAgent();
    const result = await agent.forecast({ dailyRevenue, period: days });

    return res.json({
      historical: dailyRevenue,
      forecast:   result?.forecast   ?? [],
      summary:    result?.summary    ?? '',
      trend:      result?.trend      ?? 'estável',
    });
  } catch (err) {
    console.error('[Forecast]', err.message);
    return res.status(500).json({ message: 'Erro ao gerar previsão.' });
  }
}
