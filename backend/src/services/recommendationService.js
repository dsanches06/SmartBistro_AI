import { db, IS_POSTGRES } from '../db.js';

// Devolve os itens activos do menu (máx. 30, agrupados por categoria).
export const getActiveMenuItems = async () => {
  const [rows] = await db.query(
    'SELECT id, name, category FROM items WHERE is_active = true ORDER BY category LIMIT 30'
  );
  return rows;
};

// Devolve o histórico de pedidos de um utilizador — item_id e quantas vezes pediu.
export const getUserOrderHistory = async (userId) => {
  const [rows] = await db.query(
    `SELECT oi.item_id, COUNT(*) AS times
     FROM order_items oi
     JOIN orders o ON o.id = oi.order_id
     WHERE o.user_id = ?
     GROUP BY oi.item_id
     ORDER BY times DESC
     LIMIT 10`,
    [userId]
  );
  return rows;
};

// Devolve os itens mais pedidos nos últimos 7 dias (popularidade geral).
export const getPopularItems = async () => {
  const intervalExpr = IS_POSTGRES ? "INTERVAL '7 days'" : "INTERVAL 7 DAY";
  const [rows] = await db.query(
    `SELECT oi.item_id, COUNT(*) AS orders
     FROM order_items oi
     JOIN orders o ON o.id = oi.order_id
     WHERE o.created_at >= NOW() - ${intervalExpr}
     GROUP BY oi.item_id
     ORDER BY orders DESC
     LIMIT 6`
  );
  return rows;
};
