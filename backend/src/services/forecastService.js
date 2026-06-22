import { db, IS_POSTGRES } from '../db.js';

// Devolve a faturação diária dos últimos N dias (data + total em €).
export const getDailyRevenue = async (days = 30) => {
  const intervalExpr = IS_POSTGRES ? "(? || ' days')::interval" : "INTERVAL ? DAY";
  const [rows] = await db.query(
    `SELECT DATE(issued_at) AS date, SUM(total_amount) AS total
     FROM invoices
     WHERE issued_at >= NOW() - ${intervalExpr}
     GROUP BY DATE(issued_at)
     ORDER BY date ASC`,
    [days]
  );
  return rows.map(r => {
    const dateStr = typeof r.date === 'string' ? r.date : r.date.toISOString().slice(0, 10);
    return { date: dateStr, total: Number(r.total) };
  });
};

// Devolve a receita real de uma semana específica (soma de invoices pagas).
export const getWeeklyActual = async (weekStart, weekEnd) => {
  const [rows] = await db.query(
    `SELECT COALESCE(SUM(i.total_amount), 0) AS total
     FROM invoices i
     JOIN payments p ON p.invoice_id = i.id
     WHERE p.payment_status = 'Completed'
       AND DATE(i.issued_at) >= ? AND DATE(i.issued_at) <= ?`,
    [weekStart, weekEnd]
  );
  return Number(rows[0]?.total ?? 0);
};

// Guarda ou actualiza a previsão semanal na BD.
export const saveWeeklyForecast = async ({ weekStart, weekEnd, predictedTotal, trend, summary, forecastDailyJson = null }) => {
  const dailyJson = forecastDailyJson ? JSON.stringify(forecastDailyJson) : null;
  if (IS_POSTGRES) {
    await db.query(
      `INSERT INTO weekly_forecast (week_start, week_end, predicted_total, trend, summary, forecast_daily_json)
       VALUES (?, ?, ?, ?, ?, ?)
       ON CONFLICT (week_start) DO UPDATE SET
         predicted_total     = EXCLUDED.predicted_total,
         trend               = EXCLUDED.trend,
         summary             = EXCLUDED.summary,
         forecast_daily_json = EXCLUDED.forecast_daily_json,
         generated_at        = CURRENT_TIMESTAMP`,
      [weekStart, weekEnd, predictedTotal, trend, summary, dailyJson]
    );
  } else {
    await db.query(
      `INSERT INTO weekly_forecast (week_start, week_end, predicted_total, trend, summary, forecast_daily_json)
       VALUES (?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
         predicted_total     = VALUES(predicted_total),
         trend               = VALUES(trend),
         summary             = VALUES(summary),
         forecast_daily_json = VALUES(forecast_daily_json),
         generated_at        = CURRENT_TIMESTAMP`,
      [weekStart, weekEnd, predictedTotal, trend, summary, dailyJson]
    );
  }
};

// Actualiza o actual_total de uma semana já passada.
export const updateWeeklyActual = async (weekStart, actualTotal) => {
  await db.query(
    'UPDATE weekly_forecast SET actual_total = ? WHERE week_start = ?',
    [actualTotal, weekStart]
  );
};

// Devolve todas as previsões semanais guardadas, da mais recente para a mais antiga.
export const getAllWeeklyForecasts = async () => {
  const [rows] = await db.query(
    'SELECT * FROM weekly_forecast ORDER BY week_start DESC'
  );
  return rows.map(r => ({
    id:             r.id,
    weekStart:      typeof r.week_start === 'string' ? r.week_start : r.week_start.toISOString().slice(0, 10),
    weekEnd:        typeof r.week_end   === 'string' ? r.week_end   : r.week_end.toISOString().slice(0, 10),
    predictedTotal: Number(r.predicted_total),
    actualTotal:    r.actual_total != null ? Number(r.actual_total) : null,
    trend:          r.trend,
    summary:        r.summary,
    generatedAt:   r.generated_at,
    forecastDaily: r.forecast_daily_json ? JSON.parse(r.forecast_daily_json) : [],
  }));
};
