/**
 * Processador Base de Chat — Loop agêntico com chamadas de funções em paralelo
 */

import { createGeminiChat, FunctionCallingConfigMode, CHATBOT_SYSTEM_PROMPT } from '../config/index.js';
import { MAX_AGENTIC_STEPS, synthesizeFallbackMessage, GEMINI_MODEL_QUEUE, isRetryableGeminiError } from "../../utils/index.js"

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
    return createGeminiChat(
      buildChatConfig(this.toolConfig),
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
        if (!isRetryableGeminiError(error)) throw error;
        lastError = error;
        console.warn(
          `[ChatProcessor] modelo ${model} indisponível — ${error.message}. A tentar próximo modelo...`,
        );
      }
    }
    throw lastError;
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
        if (!isRetryableGeminiError(error)) throw error;
        lastError = error;
        console.warn(
          `[ChatProcessor] modelo ${model} indisponível no stream — ${error.message}. A tentar próximo modelo...`,
        );
      }
    }
    throw lastError;
  }

  // ── Executar uma chamada de função ────────────────────────────────────────────
  async executeFunction(functionCall) {
    const { name } = functionCall;
    const rawArgs = functionCall.args || functionCall.arguments || {};
    const args = typeof rawArgs === 'string' ? JSON.parse(rawArgs) : rawArgs;
    const handler = this.functionHandlers[name];

    if (!handler) throw new Error(`Função "${name}" não está registada.`);

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
  async _streamRound(chat, message, onChunk) {
    const stream = await chat.sendMessageStream({ message });
    const functionCalls = [];
    let roundText = '';

    for await (const chunk of stream) {
      // Chamadas de função chegam normalmente no último chunk (sem texto associado)
      if (chunk.functionCalls?.length)
        functionCalls.push(...chunk.functionCalls);
      // Texto emitido imediatamente — streaming verdadeiro
      if (chunk.text) {
        roundText += chunk.text;
        onChunk(chunk.text);
      }
    }

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
