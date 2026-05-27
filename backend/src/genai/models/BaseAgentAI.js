import { createGeminiChat } from '../config/gemini.js';
import {
  buildThinkingConfig,
  parseThinkingResponse,
} from '../../utils/thinkingBotUtil.js';

/**
 * Classe base para todos os agentes GenAI do SmartBistro.
 * Encapsula a comunicação com o Gemini e o sistema de thinking.
 */
class BaseAgentAI {
  /**
   * @param {string} name        - Nome do agente (ex: 'Maitre', 'Chef', 'Manager')
   * @param {string} systemPrompt - Instrução de sistema do agente
   * @param {number} temperature  - Temperatura de geração (0.0 – 1.0)
   */
  constructor(name, systemPrompt, temperature = 0.3) {
    this.name = name;
    this.systemPrompt = systemPrompt;
    this.temperature = temperature;
  }

  /**
   * Envia uma mensagem ao agente e obtém resposta.
   *
   * @param {string} userMessage - Mensagem do utilizador / prompt de entrada
   * @param {Array<{role: string, parts: Array<{text: string}>}>} history
   *   Histórico da conversa no formato Gemini
   *   (role: 'user' | 'model')
   * @returns {Promise<{text: string, thoughts: string, raw: object}>}
   */
  async run(userMessage, history = []) {
    const thinkingConfig = buildThinkingConfig({}, this.temperature);

    const chatConfig = {
      systemInstruction: this.systemPrompt,
      temperature: this.temperature,
      thinkingConfig,
    };

    const chat = createGeminiChat(chatConfig, history);
    const response = await chat.sendMessage({ message: userMessage });

    const { text, thoughts } = parseThinkingResponse(response);
    return { text, thoughts, raw: response };
  }
}

export default BaseAgentAI;
