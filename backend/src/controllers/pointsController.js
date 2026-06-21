import { getUserPoints, redeemPoints, MIN_REDEEM, POINT_VALUE } from '../services/pointsService.js';

// GET /points/balance/:userId — devolve saldo e metadados do utilizador.
export async function getBalance(req, res) {
  const userId = parseInt(req.params.userId);
  if (!userId) return res.status(400).json({ message: 'userId obrigatório.' });

  try {
    const data = await getUserPoints(userId);
    return res.json({
      ...data,
      canRedeem:  data.balance >= MIN_REDEEM,
      minRedeem:  MIN_REDEEM,
      pointValue: POINT_VALUE,
    });
  } catch (err) {
    console.error('[Points] getBalance:', err.message);
    return res.status(500).json({ message: 'Erro ao obter saldo.' });
  }
}

// POST /points/redeem  { userId, points }
// Debita os pontos e devolve o desconto em €.
export async function redeem(req, res) {
  const { userId, points } = req.body;
  if (!userId || !points) return res.status(400).json({ message: 'userId e points obrigatórios.' });

  try {
    const discount = await redeemPoints(parseInt(userId), parseInt(points));
    return res.json({ success: true, discount, pointsUsed: parseInt(points) });
  } catch (err) {
    console.error('[Points] redeem:', err.message);
    return res.status(400).json({ message: err.message });
  }
}
