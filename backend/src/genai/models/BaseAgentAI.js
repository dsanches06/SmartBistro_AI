import {
  groq,
  chatWithFallback,
} from '../config/index.js';
import {
  normalizeGroqResponse,
  normalizeGroqTools,
} from '../../utils/groqUtil.js';
import { classifyGroqError } from '../../utils/classifyError.js';
import { PipelineError } from '../../utils/pipelineError.js';

// ── Superclasse base para todos os agentes do SmartBistro ─────────────────────
class BaseAgentAI {
  constructor(name, instruction, temperature = 0.25, tools = null) {
    this.name        = name;
    this.temperature = temperature;
    this.tools       = tools;
    this._messages   = [{ role: "system", content: instruction }];
  }

  async _call(userContent) {
    const userMsg  = { role: "user", content: String(userContent) };
    const messages = [...this._messages, userMsg];

    const options = {
      temperature: this.temperature,
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
