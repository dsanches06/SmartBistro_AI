import { db } from '../db.js';

// Devolve a faturação diária dos últimos N dias (data + total em €).
export const getDailyRevenue = async (days = 30) => {
  const [rows] = await db.query(
    `SELECT DATE(created_at) AS date, SUM(total_amount) AS total
     FROM invoices
     WHERE created_at >= NOW() - (? || ' days')::interval
     GROUP BY DATE(created_at)
     ORDER BY date ASC`,
    [days]
  );
  return rows.map(r => {
    const dateStr = typeof r.date === 'string' ? r.date : r.date.toISOString().slice(0, 10);
    return { date: dateStr, total: Number(r.total) };
  });
};
