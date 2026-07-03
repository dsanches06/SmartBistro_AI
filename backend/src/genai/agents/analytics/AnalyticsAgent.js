import { BaseAgentAI } from '../../models/index.js';
import { buildRecommendationMessage, buildForecastMessage } from './analyticsMessages.js';
import { ANALYTICS_PROMPT } from './analyticsPrompt.js';
import { extractJSON } from '../../helpers/index.js';

// Agente de Analytics — recomendações personalizadas e previsão de receitas.
// temp 0.4 → criatividade moderada nos labels; coerência mantida com os dados numéricos.
class AnalyticsAgent extends BaseAgentAI {
  constructor() {
    super('Analytics', ANALYTICS_PROMPT, 0.4, null);
  }

  // Gera recomendações de itens a partir de dados SQL pré-processados.
  // Devolve [{ item_id, label }] ou [] em caso de erro.
  async recommend(data) {
    const message = buildRecommendationMessage(data);
    const result  = await this._call(message);
    return this._parseRecommendations(result.text, data.menuItems.map(i => i.id));
  }

  // Gera previsão de receitas e texto de tendência a partir de dados históricos.
  // Devolve { forecast: [...], summary: "texto" } ou null em caso de erro.
  async forecast(data) {
    const message = buildForecastMessage(data);
    const result  = await this._call(message);
    try {
      return extractJSON(result.text || '{}', 'Analytics');
    } catch {
      return null;
    }
  }

  // Valida e filtra o JSON de recomendações para ids do menu actual.
  _parseRecommendations(raw, validIds) {
    try {
      let parsed;
      try {
        parsed = extractJSON(raw || '[]', 'Analytics');
      } catch {
        return [];
      }
      if (!Array.isArray(parsed)) return [];
      // Normaliza item_id para número (a IA pode devolver strings)
      const idSet = new Set(validIds.map(Number));
      return parsed
        .map(r => ({ ...r, item_id: Number(r.item_id) }))
        .filter(r => Number.isFinite(r.item_id) && idSet.has(r.item_id) && r.label)
        .slice(0, 6);
    } catch {
      return [];
    }
  }
}

export default AnalyticsAgent;
