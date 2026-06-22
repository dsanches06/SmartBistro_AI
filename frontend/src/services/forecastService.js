import { BACKEND_URL } from './BaseService.js';

// Solicita a previsão de receitas ao AnalyticsAgent via backend (legacy).
export async function fetchForecast(token, days = 30) {
  const res = await fetch(`${BACKEND_URL}/forecast?days=${days}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) return null;
  return res.json();
}

// Devolve todas as previsões semanais guardadas na BD.
// Devolve { forecasts, historical, dailyForecast }
export async function getWeeklyForecasts(token) {
  const res = await fetch(`${BACKEND_URL}/forecast/weekly`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) return { forecasts: [], historical: [], dailyForecast: [] };
  return res.json();
}

// Gera a previsão para a próxima semana com IA e guarda na BD.
// Devolve { weekStart, weekEnd, predictedTotal, trend, summary, allForecasts }.
export async function generateWeeklyForecast(token) {
  const res = await fetch(`${BACKEND_URL}/forecast/weekly`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.message || 'Erro ao gerar previsão.');
  }
  return res.json();
}
