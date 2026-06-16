import path from "path";
import { fileURLToPath } from "url";
import Groq from "groq-sdk";
import dotenv from "dotenv";
import {
  isRetryableGroqError,
  supportsReasoningEffort,
  normalizeGroqTools,
  normalizeGroqResponse,
} from "../../utils/groqUtil.js";
import { classifyGroqError } from "../../utils/classifyError.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, "../../../.env.local") });
dotenv.config({ path: path.resolve(__dirname, "../../../.env") });

if (!process.env.GROQ_API_KEY) {
  console.error("GROQ_API_KEY is not defined in environment variables.");
  process.exit(1);
}

export const GROQ_MODEL =
  process.env.GROQ_MODEL ||
  process.env.GROQ_MODEL_NAME ||
  "llama-3.3-70b-versatile";

// Fila de fallback ordenada por prioridade para function calling:
// NOTA: groq/compound e groq/compound-mini removidos — não suportam tool calling
const _BASE_QUEUE = [
  "llama-3.3-70b-versatile",                     // 1. melhor para function calling (padrão)
  "meta-llama/llama-4-scout-17b-16e-instruct",   // 2. Llama 4 Scout — rápido, boa capacidade
  "qwen/qwen3-32b",                               // 3. Qwen3 — raciocínio via <think>, estável
  "llama-3.1-8b-instant",                         // 4. fallback leve, menos preciso
  "openai/gpt-oss-20b",                           // 5. OpenAI reasoning rápido (last resort)
  "openai/gpt-oss-120b",                          // 6. OpenAI reasoning máximo (last resort)
];

// Coloca GROQ_MODEL como primeiro e remove duplicatas
export const GROQ_MODEL_QUEUE = [
  GROQ_MODEL,
  ..._BASE_QUEUE.filter((m) => m !== GROQ_MODEL),
];

export const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

// Nível de raciocínio para o chatbot em modelos openai/* (low | medium | high | null)
export const GROQ_REASONING_EFFORT = process.env.GROQ_REASONING_EFFORT || null;

// ── Chamada com fallback pela fila de modelos ────────────────────────────────
export async function chatWithFallback(
  messages,
  options = {},
  queue = GROQ_MODEL_QUEUE,
  idx = 0,
) {
  if (idx >= queue.length) {
    const err = new Error(
      "Todos os modelos Groq disponíveis estão indisponíveis. Aguarda alguns minutos e tenta novamente.",
    );
    err.groqType = "SERVICE_DOWN";
    throw err;
  }

  const model = queue[idx];
  const { reasoning_effort, ...restOptions } = options;
  const extraOpts =
    reasoning_effort && supportsReasoningEffort(model)
      ? { reasoning_effort }
      : {};

  try {
    console.log(`[Groq] A tentar modelo ${idx + 1}/${queue.length}: ${model}`);
    const response = await groq.chat.completions.create({
      model,
      messages,
      ...restOptions,
      ...extraOpts,
    });
    response.modelUsed = model;
    if (idx > 0) console.log(`[Groq] ✓ Fallback bem-sucedido: ${model}`);
    return response;
  } catch (error) {
    if (isRetryableGroqError(error) && idx < queue.length - 1) {
      console.warn(
        `[Groq Fallback] ${model} indisponível — "${(error.message || "").slice(0, 60)}". A tentar próximo...`,
      );
      return chatWithFallback(messages, options, queue, idx + 1);
    }
    throw error;
  }
}

// ── Sessão de chat com estado (usado pelo chatbot) ───────────────────────────
// Mantém o histórico internamente e adapta formatos de mensagem Groq/OpenAI.
export function createGroqChat(tools, systemPrompt, history = []) {
  const conversationHistory = [
    { role: "system", content: systemPrompt },
    ...history,
  ];

  return {
    getHistory: () => conversationHistory,

    sendMessage: async (input) => {
      // Formato de resultado de ferramenta: { role: "tool", parts: [...] }
      if (
        input &&
        typeof input === "object" &&
        input.role === "tool" &&
        Array.isArray(input.parts)
      ) {
        const lastAssistant = [...conversationHistory]
          .reverse()
          .find((m) => m.role === "assistant");
        const idMap = {};
        if (Array.isArray(lastAssistant?.tool_calls)) {
          for (const tc of lastAssistant.tool_calls) {
            if (tc.function?.name) idMap[tc.function.name] = tc.id;
          }
        }

        for (const part of input.parts) {
          if (part?.functionResponse) {
            const { name, response: toolResponse } = part.functionResponse;
            conversationHistory.push({
              role: "tool",
              content:
                typeof toolResponse === "string"
                  ? toolResponse
                  : JSON.stringify(toolResponse),
              tool_call_id: idMap[name] || name,
            });
          }
        }

        const response = await chatWithFallback([...conversationHistory], {
          temperature: 0.3,
          tools: normalizeGroqTools(tools),
        });
        const normalized = normalizeGroqResponse(response);
        if (normalized?.choices?.[0]?.message) {
          conversationHistory.push(normalized.choices[0].message);
        }
        return normalized;
      }

      // Mensagem de utilizador normal
      const userMsg =
        typeof input === "string"
          ? { role: "user", content: input }
          : { role: "user", content: String(input) };

      const messages = [...conversationHistory, userMsg];
      const response = await chatWithFallback(messages, {
        temperature: 0.3,
        tools: normalizeGroqTools(tools),
      });
      const normalized = normalizeGroqResponse(response);
      conversationHistory.push(userMsg);
      if (normalized?.choices?.[0]?.message) {
        conversationHistory.push(normalized.choices[0].message);
      }
      return normalized;
    },
  };
}
