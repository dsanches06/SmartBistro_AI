import { callClaude } from '../config/index.js';
import {
  normalizeClaudeResponse,
  normalizeClaudeTools,
} from '../../utils/claudeUtil.js';
import { classifyClaudeError } from '../../utils/classifyError.js';
import { PipelineError } from '../../utils/pipelineError.js';

// ── Superclasse base para todos os agentes do SmartBistro ─────────────────────
class BaseAgentAI {
  constructor(name, instruction, temperature = 0.25, tools = null) {
    this.name        = name;
    this.temperature = temperature;
    this.tools       = tools;
    this.system      = instruction;
    this._messages   = [];
  }

  async _call(userContent) {
    const userMsg  = { role: "user", content: String(userContent) };
    const messages = [...this._messages, userMsg];

    const options = {
      system:      this.system,
      temperature: this.temperature,
      ...(this.tools ? { tools: normalizeClaudeTools(this.tools) } : {}),
    };

    try {
      const response   = await callClaude(messages, options);
      const normalized = normalizeClaudeResponse(response);

      // Mantém histórico para chamadas multi-turn no mesmo agente (ex: Maître retry)
      this._messages.push(userMsg);
      this._messages.push({ role: "assistant", content: normalized.text || "" });

      return normalized;
    } catch (error) {
      const classified = classifyClaudeError(error);
      console.error(`[${this.name}] ${classified.type}:`, error.message);
      const pe = new PipelineError(classified.userMessage, {
        code:    `CLAUDE_${classified.type}`,
        stage:   'provider',
        details: { message: error?.message },
        cause:   error,
      });
      pe.aiErrorType   = classified.type;
      pe.originalError = error;
      throw pe;
    }
  }

  // ── Resposta simples (texto) ──────────────────────────────────────────────────
  async sendMessage(message) {
    const normalized = await this._call(message);
    return normalized.text;
  }

  // ── Resposta com reasoning (claude-haiku-4-5 não suporta thinking — sempre null) ─
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
