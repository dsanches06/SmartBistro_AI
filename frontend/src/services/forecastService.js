import { BACKEND_URL } from './BaseService.js';

// Solicita a previsão de receitas ao AnalyticsAgent via backend.
// Requer token de autenticação — só acessível pelo staff.
export async function fetchForecast(token, days = 30) {
  const res = await fetch(`${BACKEND_URL}/forecast?days=${days}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) return null;
  return res.json();
}
