import { getDailyRevenue, saveWeeklyForecast, getAllWeeklyForecasts, getWeeklyActual, updateWeeklyActual } from '../services/forecastService.js';
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

// POST /forecast/weekly
// Gera a previsão para a próxima semana com IA e guarda na BD.
// Deve ser chamado manualmente pelo staff — não automático (poupa tokens).
export async function generateWeeklyForecast(req, res) {
  try {
    const dailyRevenue = await getDailyRevenue(30);

    if (dailyRevenue.length < 3)
      return res.status(422).json({ message: 'Dados insuficientes para previsão (mínimo 3 dias de histórico).' });

    // Calcular datas da próxima semana (segunda a domingo) em hora local
    // Usa formatação local para evitar desvio de fuso horário com toISOString()
    const toLocalDate = (d) => {
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return `${y}-${m}-${day}`;
    };
    const today = new Date();
    const dayOfWeek = today.getDay(); // 0=Dom, 1=Seg, ...
    const daysUntilMonday = dayOfWeek === 0 ? 1 : 8 - dayOfWeek;
    const nextMonday = new Date(today);
    nextMonday.setDate(today.getDate() + daysUntilMonday);
    const nextSunday = new Date(nextMonday);
    nextSunday.setDate(nextMonday.getDate() + 6);

    const weekStart = toLocalDate(nextMonday);
    const weekEnd   = toLocalDate(nextSunday);

    const agent  = new AnalyticsAgent();
    const result = await agent.forecast({ dailyRevenue, period: 30 });

    // Somar os 7 dias de previsão para obter o total semanal
    const forecastDays    = result?.forecast ?? [];
    const predictedTotal  = forecastDays.slice(0, 7).reduce((s, d) => s + Number(d.predicted ?? 0), 0);
    const trend           = result?.trend   ?? 'estável';
    const summary         = result?.summary ?? '';

    await saveWeeklyForecast({ weekStart, weekEnd, predictedTotal: Math.round(predictedTotal * 100) / 100, trend, summary });

    // Actualizar actuals de semanas passadas que ainda não têm valor real
    const allForecasts = await getAllWeeklyForecasts();
    const todayStr = today.toISOString().slice(0, 10);
    for (const fc of allForecasts) {
      if (fc.weekEnd < todayStr && fc.actualTotal === null) {
        const actual = await getWeeklyActual(fc.weekStart, fc.weekEnd);
        await updateWeeklyActual(fc.weekStart, actual);
      }
    }

    const saved = await getAllWeeklyForecasts();
    return res.status(201).json({ weekStart, weekEnd, predictedTotal, trend, summary, allForecasts: saved });
  } catch (err) {
    console.error('[Forecast Weekly]', err.message);
    return res.status(500).json({ message: 'Erro ao gerar previsão semanal.' });
  }
}

// GET /forecast/weekly
// Devolve todas as previsões semanais guardadas (com actuals calculados automaticamente).
export async function getWeeklyForecasts(req, res) {
  try {
    const now = new Date();
    const today = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}`;
    const allForecasts = await getAllWeeklyForecasts();

    // Actualizar actuals de semanas passadas sem valor real
    for (const fc of allForecasts) {
      if (fc.weekEnd < today && fc.actualTotal === null) {
        const actual = await getWeeklyActual(fc.weekStart, fc.weekEnd);
        await updateWeeklyActual(fc.weekStart, actual);
        fc.actualTotal = actual;
      }
    }

    return res.json(allForecasts);
  } catch (err) {
    console.error('[Forecast Weekly GET]', err.message);
    return res.status(500).json({ message: 'Erro ao obter previsões.' });
  }
}
