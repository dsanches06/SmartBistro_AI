import { BACKEND_URL } from './BaseService.js';

// Solicita recomendações ao Groq via backend.
// Devolve { map: Map<item_id, label>, cacheKey: number } para controlo de cache no frontend.
export async function fetchRecommendations(token = null) {
  // Só chama se há token (user autenticado)
  if (!token) {
    return { map: new Map(), cacheKey: -1 };
  }

  const url = `${BACKEND_URL}/recommendations`;
  
  const res = await fetch(url, {
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  });

  if (!res.ok) return { map: new Map(), cacheKey: -1 };
  const data = await res.json();
  return {
    map: new Map((data.recommendations || []).map(r => [r.item_id, r.label])),
    cacheKey: data.cacheKey ?? 0,
  };
}
