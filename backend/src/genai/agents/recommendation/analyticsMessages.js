// Prompt compacto para recomendações — minimiza tokens num único request por sessão.
export function buildRecommendationMessage({ menuItems, userHistory, popular, userId }) {
  const menuStr = menuItems.map(i => `${i.id}:${i.name}(${i.category})`).join(',');
  const histStr = userHistory.length
    ? userHistory.map(h => `${h.item_id}x${h.times}`).join(',')
    : 'nenhum';
  const popStr  = popular.length
    ? popular.map(p => `${p.item_id}x${p.orders}`).join(',')
    : 'nenhum';

  return `Menu(id:nome(cat)): ${menuStr}
${userId ? `Histórico(item_idxvezes): ${histStr}` : 'Convidado (sem histórico)'}
Popular 7 dias(item_idxpedidos): ${popStr}

Regras:
- Pedido ≥3x → "O teu favorito"
- Pedido 1-2x → "Sugerido para ti"
- Popular sem histórico → "Popular esta semana"
- Convidado → labels apelativos baseados nos populares
- Máx 6 itens, labels ≤20 chars, só item_ids do menu acima

Responde APENAS com JSON: [{"item_id":N,"label":"texto"}]`;
}

// Prompt compacto para previsão de receitas — dados históricos agregados por dia.
export function buildForecastMessage({ dailyRevenue, period }) {
  const revenueStr = dailyRevenue
    .map(r => `${r.date}:${Number(r.total).toFixed(2)}`)
    .join(',');

  return `Faturação(data:€): ${revenueStr}
Período: ${period} dias

Prevê os próximos 7 dias e resume a tendência.
JSON: {"trend":"crescimento"|"estável"|"queda","summary":"≤80 chars","forecast":[{"date":"YYYY-MM-DD","predicted":N.NN}]}`;
}
