/**
 * Processador Base de Chat — Loop agêntico com chamadas de funções em paralelo
 */

import { createGeminiChat, FunctionCallingConfigMode, CHATBOT_SYSTEM_PROMPT } from '../config/index.js';
import { MAX_AGENTIC_STEPS, synthesizeFallbackMessage, GEMINI_MODEL_QUEUE, THINKING_CAPABLE_MODELS, isRetryableGeminiError, classifyGeminiError } from "../../utils/index.js"
import { PipelineError } from '../../utils/pipelineError.js';

// Gemini functionResponse.response deve ser um objeto — arrays são inválidos
function toResponsePayload(result) {
  if (Array.isArray(result)) return { items: result };
  if (result !== null && typeof result === 'object') return result;
  return { result: result ?? null };
}

// Constrói o config Gemini para o chat com suporte a function calling
function buildChatConfig(tools = []) {
  const hasTools = Array.isArray(tools) && tools.length > 0;
  return {
    systemInstruction: CHATBOT_SYSTEM_PROMPT(),
    temperature: 0.3,
    thinkingConfig: { thinkingBudget: 0 },
    ...(hasTools && {
      tools: [{ functionDeclarations: tools }],
      toolConfig: {
        functionCallingConfig: { mode: FunctionCallingConfigMode.AUTO },
      },
    }),
  };
}



export class BaseChatProcessor {
  constructor({ toolConfig = [], functionHandlers = {} }) {
    this.toolConfig = toolConfig;
    this.functionHandlers = functionHandlers;
  }

  // ── Construir histórico Gemini a partir do formato de conversa ────────────────
  buildHistory(conversationHistory = []) {
    return conversationHistory.map((item) => ({
      role: item.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: item.content }],
    }));
  }

  async _createChat(conversationHistory = [], model = null) {
    const baseConfig = buildChatConfig(this.toolConfig);
    const config = model && !THINKING_CAPABLE_MODELS.has(model)
      ? { ...baseConfig, thinkingConfig: undefined }
      : baseConfig;
    return createGeminiChat(
      config,
      this.buildHistory(conversationHistory),
      null,
      model,
    );
  }

  async _sendMessageWithFallback(conversationHistory, message) {
    let lastError;
    for (const model of GEMINI_MODEL_QUEUE) {
      try {
        const chat = await this._createChat(conversationHistory, model);
        const response = await chat.sendMessage({ message });
        if (model !== process.env.MODEL_NAME) {
          console.log(`[ChatProcessor] fallback para modelo ${model}`);
        }
        return response;
      } catch (error) {
        if (!isRetryableGeminiError(error)) {
          // Não retryable — encapsula como PipelineError para uniformizar o tratamento
          if (error?.geminiType) throw error;
          const classified = classifyGeminiError(error);
          const pe = new PipelineError(classified.userMessage ?? (error.message || 'Erro no provider'), {
            code: `GEMINI_${classified.type}`,
            stage: 'provider',
            details: { message: error?.message },
            cause: error,
          });
          pe.geminiType = classified.type;
          throw pe;
        }
        lastError = error;
        console.warn(
          `[ChatProcessor] modelo ${model} indisponível — ${error.message}. A tentar próximo modelo...`,
        );
      }
    }
    if (lastError?.name === 'PipelineError') throw lastError;
    const classifiedFinal = classifyGeminiError(lastError);
    const finalPe = new PipelineError(classifiedFinal.userMessage ?? (lastError?.message || 'Model unavailable'), {
      code: `GEMINI_${classifiedFinal.type}`,
      stage: 'provider',
      details: { message: lastError?.message },
      cause: lastError,
    });
    finalPe.geminiType = classifiedFinal.type ?? lastError?.geminiType;
    throw finalPe;
  }

  async _streamRoundWithFallback(conversationHistory, message, onChunk) {
    let lastError;
    for (const model of GEMINI_MODEL_QUEUE) {
      try {
        const chat = await this._createChat(conversationHistory, model);
        if (model !== process.env.MODEL_NAME) {
          console.log(`[ChatProcessor] fallback stream para modelo ${model}`);
        }
        return await this._streamRound(chat, message, onChunk);
      } catch (error) {
        if (!isRetryableGeminiError(error)) {
          if (error?.geminiType) throw error;
          const classified = classifyGeminiError(error);
          const pe = new PipelineError(classified.userMessage ?? (error.message || 'Erro no provider'), {
            code: `GEMINI_${classified.type}`,
            stage: 'provider',
            details: { message: error?.message },
            cause: error,
          });
          pe.geminiType = classified.type;
          throw pe;
        }
        lastError = error;
        console.warn(
          `[ChatProcessor] modelo ${model} indisponível no stream — ${error.message}. A tentar próximo modelo...`,
        );
      }
    }
    if (lastError?.name === 'PipelineError') throw lastError;
    const classifiedFinalStream = classifyGeminiError(lastError);
    const finalPeStream = new PipelineError(classifiedFinalStream.userMessage ?? (lastError?.message || 'Model unavailable'), {
      code: `GEMINI_${classifiedFinalStream.type}`,
      stage: 'provider',
      details: { message: lastError?.message },
      cause: lastError,
    });
    finalPeStream.geminiType = classifiedFinalStream.type ?? lastError?.geminiType;
    throw finalPeStream;
  }

  // ── Executar uma chamada de função ────────────────────────────────────────────
  async executeFunction(functionCall) {
    const { name } = functionCall;
    const rawArgs = functionCall.args || functionCall.arguments || {};
    const args = typeof rawArgs === 'string' ? JSON.parse(rawArgs) : rawArgs;
    const handler = this.functionHandlers[name];

    if (!handler) throw new PipelineError(`Função "${name}" não está registada.`, {
      code: 'FUNCTION_NOT_REGISTERED',
      stage: 'function_execution',
      details: { functionName: name },
    });

    const result = await handler(args);
    return { name, args, result, functionCall };
  }

  extractUserIdFromArgs(rawArgs) {
    const args =
      typeof rawArgs === 'string' ? JSON.parse(rawArgs) : rawArgs || {};
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

  isGeminiError(error) {
    return !!error?.geminiType;
  }

  // ── Loop agêntico (sem streaming) ────────────────────────────────────────────
  async processChatMessage(userMessage, conversationHistory = []) {
    try {
      const history = this.buildHistory(conversationHistory);
      let response = await this._sendMessageWithFallback(conversationHistory, userMessage);
      const allResults = [];
      let step = 0;

      while (response.functionCalls?.length && step < MAX_AGENTIC_STEPS) {
        step++;
        const callsToExecute = this.filterFunctionCalls(response.functionCalls);
        console.log(
          `[Agentic step ${step}] calling: ${callsToExecute.map((f) => f.name).join(', ')}`,
        );

        // Executa todas as funções filtradas em paralelo
        const execResults = await Promise.all(
          callsToExecute.map((fc) => this.executeFunction(fc)),
        );
        allResults.push(...execResults);

        // Devolve todos os resultados ao modelo numa única mensagem
        response = await this._sendMessageWithFallback(conversationHistory, {
          role: 'tool',
          parts: execResults.map(({ name, result }) => ({
            functionResponse: { name, response: toResponsePayload(result) },
          })),
        });
      }

      const finalText = response.text || '';
      return {
        success: true,
        message: finalText || 'Como posso ajudar?',
        functionResults: allResults.map(
          ({ name, args, result, functionCall }) => ({
            functionName: name,
            arguments: args,
            result,
            functionCall,
          }),
        ),
      };
    } catch (error) {
      if (this.isGeminiError(error)) {
        console.error(
          `[ChatProcessor] Gemini ${error.geminiType}:`,
          error.message,
        );
        return {
          success: false,
          geminiError: true,
          errorType: error.geminiType,
          message: error.message,
          functionResults: [],
        };
      }
      console.error('[ChatProcessor] Unexpected error:', error);
      return {
        success: false,
        geminiError: false,
        message: 'Ocorreu um erro interno. Tente novamente.',
        functionResults: [],
      };
    }
  }

  // ── Helper: faz streaming de um único round, emite chunks via onChunk ─────────
  async _streamRound(chat, message, onChunk, timeoutMs = 25000) {
    const functionCalls = [];
    let roundText = '';

    const makeTimeout = () => new Promise((_, reject) =>
      setTimeout(
        () => reject(Object.assign(
          new Error('O assistente demorou demasiado tempo a responder. Tente novamente. ⏱️'),
          { geminiType: 'TIMEOUT' }
        )),
        timeoutMs
      )
    );

    // Cobre tanto a ligação inicial como a leitura do stream
    const streamTask = async () => {
      const stream = await chat.sendMessageStream({ message });
      for await (const chunk of stream) {
        if (chunk.functionCalls?.length)
          functionCalls.push(...chunk.functionCalls);
        if (chunk.text) {
          roundText += chunk.text;
          onChunk(chunk.text);
        }
      }
    };

    await Promise.race([streamTask(), makeTimeout()]);

    return { functionCalls, roundText };
  }

  // ── Loop agêntico com streaming verdadeiro ────────────────────────────────────
  // Cada chunk de texto é emitido via onChunk à medida que chega do Gemini.
  // Rondas de function calling não produzem texto, por isso onChunk só dispara
  // na ronda final onde o modelo gera a resposta textual.
  async processChatMessageStream(userMessage, conversationHistory = [], onChunk) {
    const history = this.buildHistory(conversationHistory);
    const allResults = [];
    const allChunks = []; // acumula todo o texto para o campo message do retorno

    const emit = (chunk) => {
      allChunks.push(chunk);
      onChunk(chunk);
    };

    // Primeira ronda — pode ser resposta directa ou chamada de função
    let { functionCalls } = await this._streamRoundWithFallback(conversationHistory, userMessage, emit);

    // Gemini devolveu resposta vazia (sem texto, sem function calls) — força continuação
    if (!functionCalls.length && !allChunks.length) {
      ({ functionCalls } = await this._streamRoundWithFallback(
        conversationHistory,
        `${userMessage}\n\n[Sistema: continua o fluxo — chama as ferramentas necessárias para avançar.]`,
        emit,
      ));
    }

    let step = 0;

    while (functionCalls.length && step < MAX_AGENTIC_STEPS) {
      step++;
      const callsToExecute = this.filterFunctionCalls(functionCalls);
      console.log(
        `[Agentic stream step ${step}] calling: ${callsToExecute.map((f) => f.name).join(', ')}`,
      );

      // Executar todas as funções em paralelo
      const execResults = await Promise.all(
        callsToExecute.map((fc) => this.executeFunction(fc)),
      );
      allResults.push(...execResults);

      // Devolver resultados ao modelo e fazer streaming da resposta
      ({ functionCalls } = await this._streamRoundWithFallback(
        conversationHistory,
        {
          role: 'tool',
          parts: execResults.map(({ name, result }) => ({
            functionResponse: { name, response: toResponsePayload(result) },
          })),
        },
        emit,
      ));
    }

    return {
      success: true,
      message: synthesizeFallbackMessage(allChunks, allResults),
      functionResults: allResults.map(
        ({ name, args, result, functionCall }) => ({
          functionName: name,
          arguments: args,
          result,
          functionCall,
        }),
      ),
    };
  }
}
