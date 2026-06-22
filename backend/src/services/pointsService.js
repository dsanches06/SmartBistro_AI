import { db, IS_POSTGRES } from '../db.js';

const MIN_REDEEM  = 50;    // pontos mínimos para resgatar
const POINT_VALUE = 0.10;  // 1 ponto = €0.10 de desconto

// Devolve o saldo de pontos de um utilizador (0 se ainda não tiver registo).
export async function getUserPoints(userId) {
  const [rows] = await db.query(
    'SELECT balance, total_earned, total_redeemed FROM user_points WHERE user_id = ?',
    [userId]
  );
  return rows[0] ?? { balance: 0, total_earned: 0, total_redeemed: 0 };
}

// Adiciona pontos ao saldo (chamado após pagamento completo).
// amount = total pago em € → pontos = Math.floor(amount).
export async function addPoints(userId, euroAmount, orderId = null) {
  const pts = Math.floor(euroAmount);
  if (pts <= 0) return;

  if (IS_POSTGRES) {
    await db.query(`
      INSERT INTO user_points (user_id, balance, total_earned)
      VALUES (?, ?, ?)
      ON CONFLICT (user_id) DO UPDATE SET
        balance      = user_points.balance + EXCLUDED.balance,
        total_earned = user_points.total_earned + EXCLUDED.total_earned,
        updated_at   = CURRENT_TIMESTAMP
    `, [userId, pts, pts]);
  } else {
    await db.query(`
      INSERT INTO user_points (user_id, balance, total_earned)
      VALUES (?, ?, ?)
      ON DUPLICATE KEY UPDATE
        balance      = balance + VALUES(balance),
        total_earned = total_earned + VALUES(total_earned),
        updated_at   = CURRENT_TIMESTAMP
    `, [userId, pts, pts]);
  }

  await db.query(
    'INSERT INTO points_transactions (user_id, amount, description, order_id) VALUES (?, ?, ?, ?)',
    [userId, pts, `Compra #${orderId ?? '—'}`, orderId]
  );
}

// Resgata pontos — valida saldo mínimo e debita.
// Devolve o valor de desconto em € ou lança erro.
export async function redeemPoints(userId, pointsToUse) {
  if (pointsToUse < MIN_REDEEM)
    throw new Error(`Mínimo de ${MIN_REDEEM} pontos para resgatar.`);

  const current = await getUserPoints(userId);
  if (current.balance < pointsToUse)
    throw new Error(`Saldo insuficiente (${current.balance} pontos disponíveis).`);

  await db.query(`
    UPDATE user_points
    SET balance        = balance - ?,
        total_redeemed = total_redeemed + ?,
        updated_at     = CURRENT_TIMESTAMP
    WHERE user_id = ?
  `, [pointsToUse, pointsToUse, userId]);

  await db.query(
    'INSERT INTO points_transactions (user_id, amount, description) VALUES (?, ?, ?)',
    [userId, -pointsToUse, `Desconto resgatado (${pointsToUse} pts)`]
  );

  return parseFloat((pointsToUse * POINT_VALUE).toFixed(2));
}

export { MIN_REDEEM, POINT_VALUE };
