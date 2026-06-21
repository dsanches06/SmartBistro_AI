import { BACKEND_URL } from './BaseService.js';

// Devolve o saldo de pontos do utilizador (requer token).
export async function fetchPoints(token, userId) {
  const res = await fetch(`${BACKEND_URL}/points/balance/${userId}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) return null;
  return res.json();
}

// Resgata pontos e devolve o desconto em € (requer token).
export async function redeemPoints(token, userId, points) {
  const res = await fetch(`${BACKEND_URL}/points/redeem`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ userId, points }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Erro ao resgatar pontos.');
  return data;
}
