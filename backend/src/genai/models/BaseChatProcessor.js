/**
 * Processador Base de Chat — Loop agêntico com Claude e tool use
 */

import {
  anthropic,
  CLAUDE_MODEL,
  callClaude,
  CHATBOT_SYSTEM_PROMPT,
} from '../config/index.js';
import {
  normalizeClaudeTools,
  normalizeClaudeResponse,
  normalizeClaudeText,
  extractClaudeToolUses,
  toResponsePayload,
} from '../../utils/claudeUtil.js';
import { classifyClaudeError } from '../../utils/classifyError.js';
import { MAX_AGENTIC_STEPS, synthesizeFallbackMessage } from '../../utils/index.js';
import { PipelineError } from '../../utils/pipelineError.js';

export class BaseChatProcessor {
  constructor({ toolConfig = [], functionHandlers = {} }) {
    this.toolConfig       = toolConfig;
    this.functionHandlers = functionHandlers;
  }

  // ── Histórico já está no formato Claude (role + content string) ─────────────
  buildHistory(conversationHistory = []) {
    return conversationHistory.map((item) => ({
      role:    item.role === 'assistant' ? 'assistant' : 'user',
      content: item.content,
    }));
  }

  // ── Executa uma chamada de função registada ───────────────────────────────────
  async executeFunction(functionCall) {
    const { name } = functionCall;
    const rawArgs  = functionCall.args || functionCall.arguments || {};
    const args     = typeof rawArgs === 'string' ? JSON.parse(rawArgs) : rawArgs;
    const handler  = this.functionHandlers[name];

    if (!handler)
      throw new PipelineError(`Função "${name}" não está registada.`, {
        code:    'FUNCTION_NOT_REGISTERED',
        stage:   'function_execution',
        details: { functionName: name },
      });

    const result = await handler(args);
    return { name, args, result, functionCall };
  }

  extractUserIdFromArgs(rawArgs) {
    const args = typeof rawArgs === 'string' ? JSON.parse(rawArgs) : rawArgs || {};
    return args.user_id ?? args.userId ?? null;
  }

  filterFunctionCalls(functionCalls = []) {
    const hasCreateWithUserId = functionCalls.some((fc) => {
      if (fc.name !== 'set_create_task_values') return false;
      return this.extractUserIdFromArgs(fc.args) != null;
    });
    if (!hasCreateWithUserId) return functionCalls;
    return functionCalls.filter((fc) => fc.name !== 'set_assign_task_values');
  }

  // ── Chamada Claude sem streaming ──────────────────────────────────────────────
  async _callClaude(messages, systemPrompt) {
    try {
      const response = await callClaude(messages, {
        system:      systemPrompt,
        temperature: 0.3,
        tools:       normalizeClaudeTools(this.toolConfig),
      });
      return normalizeClaudeResponse(response);
    } catch (error) {
      const classified = classifyClaudeError(error);
      const pe = new PipelineError(classified.userMessage, {
        code:    `CLAUDE_${classified.type}`,
        stage:   'provider',
        details: { message: error?.message },
        cause:   error,
      });
      pe.aiErrorType = classified.type;
      throw pe;
    }
  }

  // ── Streaming de um único round (emite chunks via onChunk) ────────────────────
  async _streamRound(messages, systemPrompt, onChunk, timeoutMs = 45000) {
    const makeTimeout = () =>
      new Promise((_, reject) =>
        setTimeout(
          () => reject(Object.assign(
            new Error('O assistente demorou demasiado tempo a responder. Tente novamente. ⏱️'),
            { aiErrorType: 'TIMEOUT' },
          )),
          timeoutMs,
        ),
      );

    try {
      const stream = anthropic.messages.stream({
        model:       CLAUDE_MODEL,
        max_tokens:  4096,
        system:      systemPrompt,
        messages,
        temperature: 0.3,
        tools:       normalizeClaudeTools(this.toolConfig),
      });

      stream.on('text', (text) => onChunk(text));

      const finalMessage = await Promise.race([stream.finalMessage(), makeTimeout()]);

      return {
        functionCalls: extractClaudeToolUses(finalMessage.content),
        roundText:     normalizeClaudeText(finalMessage.content),
        assistantMsg:  { role: 'assistant', content: finalMessage.content },
      };
    } catch (err) {
      const classified = classifyClaudeError(err);
      const pe = new PipelineError(classified.userMessage, {
        code:    `CLAUDE_${classified.type}`,
        stage:   'provider',
        details: { message: err?.message },
        cause:   err,
      });
      pe.aiErrorType = classified.type;
      throw pe;
    }
  }

  // Pode ser sobreposto por subclasses para injectar contexto (ex: nome do cliente)
  getSystemPrompt() {
    return CHATBOT_SYSTEM_PROMPT();
  }

  // ── Loop agêntico sem streaming ───────────────────────────────────────────────
  async processChatMessage(userMessage, conversationHistory = []) {
    try {
      const systemPrompt = this.getSystemPrompt();
      const messages = [
        ...this.buildHistory(conversationHistory),
        { role: 'user', content: userMessage },
      ];

      let response = await this._callClaude(messages, systemPrompt);
      messages.push({ role: 'assistant', content: response.content });

      const allResults = [];
      let step = 0;

      while (response.functionCalls?.length && step < MAX_AGENTIC_STEPS) {
        step++;
        const callsToExecute = this.filterFunctionCalls(response.functionCalls);
        console.log(`[Agentic step ${step}] calling: ${callsToExecute.map((f) => f.name).join(', ')}`);

        const execResults = await Promise.all(callsToExecute.map((fc) => this.executeFunction(fc)));
        allResults.push(...execResults);

        // Todos os tool_results de uma ronda vão numa ÚNICA mensagem 'user'
        messages.push({
          role: 'user',
          content: execResults.map((er) => ({
            type:        'tool_result',
            tool_use_id: er.functionCall.raw?.id || er.name,
            content:     JSON.stringify(toResponsePayload(er.result)),
          })),
        });

        response = await this._callClaude(messages, systemPrompt);
        messages.push({ role: 'assistant', content: response.content });
      }

      return {
        success:         true,
        message:         response.text || 'Como posso ajudar?',
        functionResults: allResults.map(({ name, args, result, functionCall }) => ({
          functionName: name, arguments: args, result, functionCall,
        })),
      };
    } catch (error) {
      if (error?.aiErrorType) {
        console.error(`[ChatProcessor] Claude ${error.aiErrorType}:`, error.message);
        return { success: false, aiError: true, errorType: error.aiErrorType, message: error.message, functionResults: [] };
      }
      console.error('[ChatProcessor] Unexpected error:', error);
      return { success: false, aiError: false, message: 'Ocorreu um erro interno. Tente novamente.', functionResults: [] };
    }
  }

  // ── Loop agêntico com streaming verdadeiro ────────────────────────────────────
  async processChatMessageStream(userMessage, conversationHistory = [], onChunk) {
    const systemPrompt = this.getSystemPrompt();
    const messages = [
      ...this.buildHistory(conversationHistory),
      { role: 'user', content: userMessage },
    ];

    const allResults = [];
    const allChunks  = [];
    const emit       = (chunk) => { allChunks.push(chunk); onChunk(chunk); };

    let { functionCalls, assistantMsg } = await this._streamRound(messages, systemPrompt, emit);

    // Claude devolveu vazio — força continuação SEM adicionar o assistantMsg vazio ao array
    // (dois assistant consecutivos sem user entre eles viola o formato da Claude API → 400)
    if (!functionCalls.length && !allChunks.length) {
      ({ functionCalls, assistantMsg } = await this._streamRound(
        [...messages, {
          role:    'user',
          content: `${userMessage}\n\n[Sistema: continua o fluxo — chama as ferramentas necessárias para avançar.]`,
        }],
        systemPrompt,
        emit,
      ));
    }

    // Só agora adiciona o assistantMsg definitivo (1ª ou 2ª ronda)
    messages.push(assistantMsg);

    let step = 0;

    while (functionCalls.length && step < MAX_AGENTIC_STEPS) {
      step++;
      const callsToExecute = this.filterFunctionCalls(functionCalls);
      console.log(`[Agentic stream step ${step}] calling: ${callsToExecute.map((f) => f.name).join(', ')}`);

      const execResults = await Promise.all(callsToExecute.map((fc) => this.executeFunction(fc)));
      allResults.push(...execResults);

      messages.push({
        role: 'user',
        content: execResults.map((er) => ({
          type:        'tool_result',
          tool_use_id: er.functionCall.raw?.id || er.name,
          content:     JSON.stringify(toResponsePayload(er.result)),
        })),
      });

      // Usa chamada directa (sem streaming) para rounds intermédios de tools —
      // é muito mais rápido e não tem risco de timeout.
      // Se a resposta tiver texto (ronda final), emite-o de uma vez.
      const nextResp = await this._callClaude(messages, systemPrompt);
      messages.push({ role: 'assistant', content: nextResp.content });

      functionCalls = nextResp.functionCalls ?? [];

      if (nextResp.text) emit(nextResp.text);
    }

    return {
      success:         true,
      message:         synthesizeFallbackMessage(allChunks, allResults),
      functionResults: allResults.map(({ name, args, result, functionCall }) => ({
        functionName: name, arguments: args, result, functionCall,
      })),
    };
  }
}
