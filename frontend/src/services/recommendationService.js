import { BACKEND_URL } from './BaseService.js';

// Solicita recomendações ao Groq via backend num único request por sessão.
// userId opcional — se fornecido, gera sugestões personalizadas; caso contrário, usa populares.
export async function fetchRecommendations(userId = null) {
  const url = userId
    ? `${BACKEND_URL}/recommendations?userId=${userId}`
    : `${BACKEND_URL}/recommendations`;

  const res = await fetch(url);
  if (!res.ok) return [];
  const data = await res.json();
  // Devolve Map: item_id → label para acesso O(1) nos cards
  return new Map((data.recommendations || []).map(r => [r.item_id, r.label]));
}
