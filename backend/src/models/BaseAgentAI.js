import { createGeminiChat, FunctionCallingConfigMode } from "../config/gemini.js";
import { classifyGeminiError } from "../utils/classifyError.js";
import { buildThinkingConfig, parseThinkingResponse } from "../utils/thinkingUtils.js";

// ── Superclasse Base para todos os agentes ────────────────────────────────────
class BaseAgentAI {
  constructor(name, instruction, temperature = 0.25, tools = null, history = [], thinking = false) {
    this.name = name;
    this.thinking = thinking;

    const config = {
      systemInstruction: instruction,
      temperature,
    };

    if (tools) {
      config.tools = [{ functionDeclarations: tools }];
      config.toolConfig = { functionCallingConfig: { mode: FunctionCallingConfigMode.AUTO } };
    }

    if (thinking) {
      const thinkingOptions = typeof thinking === "object" ? thinking : {};
      config.thinkingConfig = buildThinkingConfig(thinkingOptions, temperature);
    }

    this.chat = createGeminiChat(config, history);
  }

  /* Função para  */
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

  // Retorna { text, thoughts } — útil quando thinking está ativado
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

  /* */
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
