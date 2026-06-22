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
