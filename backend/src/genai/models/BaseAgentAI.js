import { createGeminiChat, FunctionCallingConfigMode } from '../config/index.js';
import { classifyGeminiError, buildThinkingConfig, parseThinkingResponse } from '../../utils/index.js';

// ── Superclasse base para todos os agentes do SmartBistro ─────────────────────
class BaseAgentAI {
  /**
   * @param {string}         name        - Nome do agente (ex: 'Maitre', 'Chef', 'Manager')
   * @param {string}         instruction - System instruction do agente
   * @param {number}         temperature - Temperatura de geração (0.0 – 1.0)
   * @param {Array|null}     tools       - Declarações de ferramentas (function calling)
   * @param {Array}          history     - Histórico inicial da conversa
   * @param {boolean|object} thinking    - Activa thinking; se object, usa como thinkingOptions
   */
  constructor(name, instruction, temperature = 0.25, tools = null, history = [], thinking = false) {
    this.name = name;
    this.thinking = thinking;

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

    this.chat = createGeminiChat(config, history);
  }

  // ── Resposta simples (texto) ──────────────────────────────────────────────────
  async sendMessage(message) {
    try {
      const response = await this.chat.sendMessage({ message });
      return response.text;
    } catch (error) {
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
