import { createGeminiChat, FunctionCallingConfigMode } from '../config/index.js';
import {
  classifyGeminiError,
  buildThinkingConfig,
  parseThinkingResponse,
  isRetryableGeminiError,
  sendWithModelFallback,
} from '../../utils/index.js';

// ── Superclasse base para todos os agentes do SmartBistro ─────────────────────
class BaseAgentAI {
  /**
   * @param {string}         name        - Nome do agente (ex: 'Maitre', 'Chef', 'Manager')
   * @param {string}         instruction - System instruction do agente
   * @param {number}         temperature - Temperatura de geração (0.0 – 1.0)
   * @param {Array|null}     tools       - Declarações de ferramentas (function calling)
   * @param {Array}          history     - Histórico inicial da conversa
   * @param {boolean|object} thinking    - Activa thinking; se object, usa como thinkingOptions
   * @param {string|null}    apiKey      - Chave API própria do agente; null → usa GEMINI_API_KEY
   */
  constructor(name, instruction, temperature = 0.25, tools = null, history = [], thinking = false, apiKey = null) {
    this.name    = name;
    this.thinking = thinking;
    this.apiKey   = apiKey;
    this._history = history; // guardado para fallback (novo chat com modelo alternativo)

    const config = {
      systemInstruction: instruction,
      temperature,
    };

    if (tools) {
      config.tools = [{ functionDeclarations: tools }];
      config.toolConfig = {
        functionCallingConfig: { mode: FunctionCallingConfigMode.AUTO },
      };
    }

    if (thinking) {
      const thinkingOptions = typeof thinking === 'object' ? thinking : {};
      config.thinkingConfig = buildThinkingConfig(thinkingOptions, temperature);
    }

    this._chatConfig = config; // guardado para fallback
    this.chat = createGeminiChat(config, history, apiKey);
  }

  // ── Resposta simples (texto) ──────────────────────────────────────────────────
  async sendMessage(message) {
    try {
      const response = await this.chat.sendMessage({ message });
      return response.text;
    } catch (error) {
      // Quota / modelo indisponível → tenta os modelos da fila automaticamente
      if (isRetryableGeminiError(error)) {
        console.warn(`[${this.name}] Quota/indisponibilidade no modelo principal. A tentar fallback...`);
        const { text } = await sendWithModelFallback(
          this._chatConfig,
          this._history,
          message,
          undefined,    // usa GEMINI_MODEL_QUEUE por defeito
          this.apiKey,
        );
        return text;
      }
      const classified = classifyGeminiError(error);
      console.error(`[${this.name}] ${classified.type}:`, error.message);
      const enriched = new Error(classified.userMessage);
      enriched.geminiType = classified.type;
      enriched.originalError = error;
      throw enriched;
    }
  }

  // ── Resposta com thoughts (útil quando thinking está activo) ──────────────────
  async sendMessageWithThoughts(message) {
    try {
      const response = await this.chat.sendMessage({ message });
      return parseThinkingResponse(response);
    } catch (error) {
      if (isRetryableGeminiError(error)) {
        console.warn(`[${this.name}] Quota/indisponibilidade. A tentar fallback (sem thoughts)...`);
        const { text } = await sendWithModelFallback(
          this._chatConfig,
          this._history,
          message,
          undefined,
          this.apiKey,
        );
        return { text, thoughts: null }; // fallback não garante thoughts
      }
      const classified = classifyGeminiError(error);
      console.error(`[${this.name}] ${classified.type}:`, error.message);
      const enriched = new Error(classified.userMessage);
      enriched.geminiType = classified.type;
      enriched.originalError = error;
      throw enriched;
    }
  }

  // ── Streaming ─────────────────────────────────────────────────────────────────
  async sendMessageStream(message) {
    try {
      return await this.chat.sendMessageStream({ message });
    } catch (error) {
      const classified = classifyGeminiError(error);
      console.error(`[${this.name}] ${classified.type}:`, error.message);
      const enriched = new Error(classified.userMessage);
      enriched.geminiType = classified.type;
      enriched.originalError = error;
      throw enriched;
    }
  }
}

export default BaseAgentAI;
