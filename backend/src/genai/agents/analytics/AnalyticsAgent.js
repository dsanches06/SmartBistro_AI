import { BaseAgentAI } from '../../models/index.js';
import { buildRecommendationMessage, buildForecastMessage } from './analyticsMessages.js';
import { ANALYTICS_PROMPT } from './analyticsPrompt.js';

// Agente de Analytics — recomendações personalizadas e previsão de receitas.
// temp 0.4 → criatividade moderada nos labels; coerência mantida com os dados numéricos.
class AnalyticsAgent extends BaseAgentAI {
  constructor() {
    super('Analytics', ANALYTICS_PROMPT, 0.4, null, 'analytics');
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
      const cleaned = (result.text || '{}').replace(/```json\n?|\n?```/g, '').trim();
      return JSON.parse(cleaned);
    } catch {
      return null;
    }
  }

  // Valida e filtra o JSON de recomendações para ids do menu actual.
  _parseRecommendations(raw, validIds) {
    try {
      const cleaned = (raw || '[]').replace(/```json\n?|\n?```/g, '').trim();
      const parsed  = JSON.parse(cleaned);
      const idSet   = new Set(validIds);
      return parsed.filter(r => idSet.has(r.item_id)).slice(0, 6);
    } catch {
      return [];
    }
  }
}

export default AnalyticsAgent;
