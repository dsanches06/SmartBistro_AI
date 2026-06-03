import {
  groq,
  chatWithFallback,
} from '../config/index.js';
import {
  normalizeGroqResponse,
  normalizeGroqTools,
} from '../../utils/groqUtil.js';
import { classifyGroqError } from '../../utils/classifyError.js';
import { getThinkingLevel } from '../../utils/thinkingBotUtil.js';
import { PipelineError } from '../../utils/pipelineError.js';

// ── Superclasse base para todos os agentes do SmartBistro ─────────────────────
class BaseAgentAI {
  /**
   * @param {string}     name        - Nome do agente (ex: 'Maitre', 'Chef', 'Manager')
   * @param {string}     instruction - System instruction do agente
   * @param {number}     temperature - Temperatura de geração (0.0 – 1.0)
   * @param {Array|null} tools       - Declarações de ferramentas (function calling)
   * @param {Array}      history     - Histórico inicial (ignorado — compatibilidade)
   * @param {boolean}    thinking    - Activa reasoning_effort nos modelos OpenAI/Groq
   */
  constructor(name, instruction, temperature = 0.25, tools = null, history = [], thinking = false) {
    this.name        = name;
    this.thinking    = thinking;
    this.temperature = temperature;
    this.tools       = tools;

    // O histórico começa com a system instruction; sendMessage acrescenta turns
    this._messages = [{ role: "system", content: instruction }];
  }

  // ── Opções de raciocínio — getThinkingLevel mapeia temp → "low"|"medium"|"high"
  _reasoningOptions() {
    if (!this.thinking) return {};
    return { reasoning_effort: getThinkingLevel(this.temperature) };
  }

  // ── Chamada interna com fallback ──────────────────────────────────────────────
  async _call(userContent) {
    const userMsg  = { role: "user", content: String(userContent) };
    const messages = [...this._messages, userMsg];

    const options = {
      temperature: this.temperature,
      ...this._reasoningOptions(),
      ...(this.tools ? { tools: normalizeGroqTools(this.tools) } : {}),
    };

    try {
      const response   = await chatWithFallback(messages, options);
      const normalized = normalizeGroqResponse(response);

      // Mantém histórico para chamadas multi-turn no mesmo agente (ex: Maître retry)
      this._messages.push(userMsg);
      this._messages.push({ role: "assistant", content: normalized.text || "" });

      return normalized;
    } catch (error) {
      const classified = classifyGroqError(error);
      console.error(`[${this.name}] ${classified.type}:`, error.message);
      const pe = new PipelineError(classified.userMessage, {
        code:    `GROQ_${classified.type}`,
        stage:   'provider',
        details: { message: error?.message },
        cause:   error,
      });
      pe.groqType     = classified.type;
      pe.originalError = error;
      throw pe;
    }
  }

  // ── Resposta simples (texto) ──────────────────────────────────────────────────
  async sendMessage(message) {
    const normalized = await this._call(message);
    return normalized.text;
  }

  // ── Resposta com reasoning (captura reasoning_content / <think>) ──────────────
  async sendMessageWithThoughts(message) {
    const normalized = await this._call(message);
    return { text: normalized.text, thoughts: normalized.thinking ?? null };
  }

  // ── Streaming (compatibilidade — devolve resposta completa) ──────────────────
  async sendMessageStream(message) {
    return this._call(message);
  }
}

export default BaseAgentAI;
