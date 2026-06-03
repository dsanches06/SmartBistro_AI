/**
 * Processador Base de Chat — Loop agêntico com Groq e function calling
 */

import {
  groq,
  GROQ_MODEL_QUEUE,
  chatWithFallback,
  CHATBOT_SYSTEM_PROMPT,
  GROQ_REASONING_EFFORT,
} from '../config/index.js';
import {
  normalizeGroqTools,
  normalizeGroqResponse,
  parseGroqFunctionArgs,
  createThinkTagFilter,
  isRetryableGroqError,
  supportsReasoningEffort,
  toResponsePayload,
} from '../../utils/groqUtil.js';
import { classifyGroqError } from '../../utils/classifyError.js';
import { MAX_AGENTIC_STEPS, synthesizeFallbackMessage } from '../../utils/index.js';
import { PipelineError } from '../../utils/pipelineError.js';

export class BaseChatProcessor {
  constructor({ toolConfig = [], functionHandlers = {} }) {
    this.toolConfig       = toolConfig;
    this.functionHandlers = functionHandlers;
  }

  // ── Histórico já está no formato OpenAI — só normaliza o role ────────────────
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

  // ── Chamada Groq sem streaming (com fallback) ─────────────────────────────────
  async _callGroq(messages) {
    try {
      const response = await chatWithFallback(messages, {
        temperature:      0.3,
        tools:            normalizeGroqTools(this.toolConfig),
        // reasoning_effort só é aplicado por chatWithFallback em modelos openai/*
        ...(GROQ_REASONING_EFFORT && { reasoning_effort: GROQ_REASONING_EFFORT }),
      });
      return normalizeGroqResponse(response);
    } catch (error) {
      const classified = classifyGroqError(error);
      const pe = new PipelineError(classified.userMessage, {
        code:    `GROQ_${classified.type}`,
        stage:   'provider',
        details: { message: error?.message },
        cause:   error,
      });
      pe.groqType = classified.type;
      throw pe;
    }
  }

  // ── Streaming de um único round (emite chunks via onChunk) ────────────────────
  async _streamRound(messages, onChunk, timeoutMs = 45000) {
    let stream = null;

    for (let i = 0; i < GROQ_MODEL_QUEUE.length; i++) {
      const model = GROQ_MODEL_QUEUE[i];
      try {
        const streamOpts = {
          model,
          messages,
          temperature: 0.3,
          tools:       normalizeGroqTools(this.toolConfig),
          stream:      true,
          // reasoning_effort apenas para modelos openai/* que o suportam
          ...(GROQ_REASONING_EFFORT && supportsReasoningEffort(model)
            ? { reasoning_effort: GROQ_REASONING_EFFORT }
            : {}),
        };
        stream = await groq.chat.completions.create(streamOpts);
        if (i > 0) console.log(`[ChatProcessor] fallback stream para modelo ${model}`);
        break;
      } catch (err) {
        if (isRetryableGroqError(err) && i < GROQ_MODEL_QUEUE.length - 1) {
          console.warn(`[ChatProcessor] ${model} indisponível no stream. A tentar próximo...`);
          continue;
        }
        const classified = classifyGroqError(err);
        const pe = new PipelineError(classified.userMessage, {
          code:    `GROQ_${classified.type}`,
          stage:   'provider',
          details: { message: err?.message },
          cause:   err,
        });
        pe.groqType = classified.type;
        throw pe;
      }
    }

    const thinkFilter  = createThinkTagFilter(onChunk);
    let   fullContent  = '';
    const toolCallsAcc = {};

    const streamTask = async () => {
      for await (const chunk of stream) {
        const delta = chunk.choices?.[0]?.delta || {};

        if (delta.content) {
          fullContent += delta.content;
          thinkFilter.feed(delta.content);
        }

        if (Array.isArray(delta.tool_calls)) {
          for (const tc of delta.tool_calls) {
            const idx = tc.index ?? 0;
            if (!toolCallsAcc[idx]) {
              toolCallsAcc[idx] = { id: '', type: 'function', function: { name: '', arguments: '' } };
            }
            if (tc.id)               toolCallsAcc[idx].id = tc.id;
            if (tc.function?.name)   toolCallsAcc[idx].function.name      += tc.function.name;
            if (tc.function?.arguments) toolCallsAcc[idx].function.arguments += tc.function.arguments;
          }
        }
      }
    };

    const makeTimeout = () =>
      new Promise((_, reject) =>
        setTimeout(
          () => reject(Object.assign(
            new Error('O assistente demorou demasiado tempo a responder. Tente novamente. ⏱️'),
            { groqType: 'TIMEOUT' },
          )),
          timeoutMs,
        ),
      );

    await Promise.race([streamTask(), makeTimeout()]);
    thinkFilter.finalize();

    // Garante que cada tool call tem um id não-vazio.
    // Groq valida que tool_call_id no resultado corresponde ao id do tool_call —
    // se o id ficar '' durante o streaming, a próxima chamada retorna 400.
    const toolCalls = Object.values(toolCallsAcc)
      .filter((tc) => tc.function?.name)
      .map((tc) => ({
        ...tc,
        id: tc.id || `call_${tc.function.name}_${Date.now()}`,
      }));

    const assistantMsg = {
      role:    'assistant',
      content: fullContent || null,
      ...(toolCalls.length && { tool_calls: toolCalls }),
    };

    const functionCalls = toolCalls.map((tc) => ({
      name: tc.function.name,
      args: parseGroqFunctionArgs(tc.function.arguments),
      raw:  tc,  // tc.id é agora garantidamente não-vazio
    }));

    return { functionCalls, roundText: fullContent, assistantMsg };
  }

  // ── Loop agêntico sem streaming ───────────────────────────────────────────────
  async processChatMessage(userMessage, conversationHistory = []) {
    try {
      const messages = [
        { role: 'system', content: CHATBOT_SYSTEM_PROMPT() },
        ...this.buildHistory(conversationHistory),
        { role: 'user', content: userMessage },
      ];

      let response = await this._callGroq(messages);
      if (response.choices?.[0]?.message) messages.push(response.choices[0].message);

      const allResults = [];
      let step = 0;

      while (response.functionCalls?.length && step < MAX_AGENTIC_STEPS) {
        step++;
        const callsToExecute = this.filterFunctionCalls(response.functionCalls);
        console.log(`[Agentic step ${step}] calling: ${callsToExecute.map((f) => f.name).join(', ')}`);

        const execResults = await Promise.all(callsToExecute.map((fc) => this.executeFunction(fc)));
        allResults.push(...execResults);

        for (const er of execResults) {
          messages.push({
            role:        'tool',
            content:     JSON.stringify(toResponsePayload(er.result)),
            tool_call_id: er.functionCall.raw?.id || er.name,
          });
        }

        response = await this._callGroq(messages);
        if (response.choices?.[0]?.message) messages.push(response.choices[0].message);
      }

      return {
        success:         true,
        message:         response.text || 'Como posso ajudar?',
        functionResults: allResults.map(({ name, args, result, functionCall }) => ({
          functionName: name, arguments: args, result, functionCall,
        })),
      };
    } catch (error) {
      if (error?.groqType) {
        console.error(`[ChatProcessor] Groq ${error.groqType}:`, error.message);
        return { success: false, groqError: true, errorType: error.groqType, message: error.message, functionResults: [] };
      }
      console.error('[ChatProcessor] Unexpected error:', error);
      return { success: false, groqError: false, message: 'Ocorreu um erro interno. Tente novamente.', functionResults: [] };
    }
  }

  // ── Loop agêntico com streaming verdadeiro ────────────────────────────────────
  async processChatMessageStream(userMessage, conversationHistory = [], onChunk) {
    const messages = [
      { role: 'system', content: CHATBOT_SYSTEM_PROMPT() },
      ...this.buildHistory(conversationHistory),
      { role: 'user', content: userMessage },
    ];

    const allResults = [];
    const allChunks  = [];
    const emit       = (chunk) => { allChunks.push(chunk); onChunk(chunk); };

    let { functionCalls, assistantMsg } = await this._streamRound(messages, emit);

    // Groq devolveu vazio — força continuação SEM adicionar o assistantMsg vazio ao array
    // (dois assistant consecutivos sem user entre eles viola o formato OpenAI → 400)
    if (!functionCalls.length && !allChunks.length) {
      ({ functionCalls, assistantMsg } = await this._streamRound(
        [...messages, {
          role:    'user',
          content: `${userMessage}\n\n[Sistema: continua o fluxo — chama as ferramentas necessárias para avançar.]`,
        }],
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

      for (const er of execResults) {
        messages.push({
          role:        'tool',
          content:     JSON.stringify(toResponsePayload(er.result)),
          tool_call_id: er.functionCall.raw?.id || er.name,
        });
      }

      // Usa chamada directa (sem streaming) para rounds intermédios de tools —
      // é muito mais rápido e não tem risco de timeout.
      // Se a resposta tiver texto (ronda final), emite-o de uma vez.
      const nextResp = await this._callGroq(messages);
      const nextMsg  = nextResp.choices?.[0]?.message;
      if (nextMsg) messages.push(nextMsg);

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
