/**
 * Processador Base de Chat — Loop agêntico com chamadas de funções em paralelo
 */

import { createGeminiChat, FunctionCallingConfigMode, CHATBOT_SYSTEM_PROMPT } from '../config/index.js';
import { MAX_AGENTIC_STEPS } from "../../utils/index.js"

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
      const chat = createGeminiChat(buildChatConfig(this.toolConfig), history);

      let response = await chat.sendMessage({ message: userMessage });
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
        response = await chat.sendMessage({
          message: {
            role: 'tool',
            parts: execResults.map(({ name, result }) => ({
              functionResponse: { name, response: result },
            })),
          },
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
    const chat = createGeminiChat(buildChatConfig(this.toolConfig), history);
    const allResults = [];
    const allChunks = []; // acumula todo o texto para o campo message do retorno

    const emit = (chunk) => {
      allChunks.push(chunk);
      onChunk(chunk);
    };

    // Primeira ronda — pode ser resposta directa ou chamada de função
    let { functionCalls } = await this._streamRound(chat, userMessage, emit);
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
      ({ functionCalls } = await this._streamRound(
        chat,
        {
          role: 'tool',
          parts: execResults.map(({ name, result }) => ({
            functionResponse: { name, response: result },
          })),
        },
        emit,
      ));
    }

    return {
      success: true,
      message: allChunks.join(''),
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
