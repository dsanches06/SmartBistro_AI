import { GoogleGenAI } from "@google/genai";

// ── Papéis na tabela `roles` ──────────────────────────────────────────────────
export const ROLE_USER      = 2; // role: "user"
export const ROLE_ASSISTANT = 3; // role: "assistant"

// ── Limite de passos agênticos por sessão de chatbot ─────────────────────────
export const MAX_AGENTIC_STEPS = 5;

// ── Fila de modelos Gemini por ordem de preferência ──────────────────────────
// Modelos disponíveis na chave actual (sem prefixo "models/").
// Ordenados do mais capaz para o mais disponível.
// Se o modelo principal (MODEL_NAME do .env) falhar por quota/indisponibilidade,
// sendWithModelFallback percorre esta lista automaticamente.
export const GEMINI_MODEL_QUEUE = [
  "gemini-2.5-pro",           // pro — máxima capacidade de raciocínio e JSON estruturado
  "gemini-3.1-pro-preview",   // pro preview — geração mais recente
  "gemini-3.5-flash",         // flash mais recente — rápido e muito capaz
  "gemini-3.1-flash-lite",    // flash lite 3.1 — boa velocidade
  "gemini-2.5-flash",         // flash estável — equilíbrio comprovado
  "gemini-2.5-flash-lite",    // último recurso — mais leve, maior disponibilidade
];

// ── Erros que justificam tentar o próximo modelo ──────────────────────────────
// 429 = RESOURCE_EXHAUSTED (quota/rate limit)
// 503 = Service Unavailable (modelo sobrecarregado)
export function isRetryableGeminiError(error) {
  const msg    = (error?.message ?? "").toLowerCase();
  const status = Number(error?.status ?? error?.code ?? 0);
  return (
    status === 429 ||
    status === 503 ||
    msg.includes("quota") ||
    msg.includes("rate limit") ||
    msg.includes("resource_exhausted") ||
    msg.includes("overloaded") ||
    msg.includes("unavailable") ||
    msg.includes("too many requests")
  );
}

/**
 * Envia uma mensagem percorrendo a fila de modelos Gemini.
 * Se o modelo actual falhar por quota/indisponibilidade, passa automaticamente
 * ao seguinte — sem interromper o pipeline nem o chatbot.
 *
 * @param {object}      chatConfig  - Config do chat (systemInstruction, temperature, tools, thinkingConfig, …)
 * @param {Array}       history     - Histórico da conversa até ao momento
 * @param {string}      message     - Mensagem a enviar
 * @param {string[]}    [queue]     - Fila de modelos; por defeito usa GEMINI_MODEL_QUEUE
 * @param {string|null} [apiKey]    - Chave API; null → usa GEMINI_API_KEY do env
 * @param {number}      [idx]       - Índice interno para recursão (não usar externamente)
 * @returns {Promise<{ text: string, modelUsed: string }>}
 *
 * @example
 * const { text, modelUsed } = await sendWithModelFallback(
 *   { systemInstruction: "És um assistente.", temperature: 0.5 },
 *   [],
 *   "Olá, como estás?",
 * );
 */
export async function sendWithModelFallback(
  chatConfig,
  history = [],
  message,
  queue = GEMINI_MODEL_QUEUE,
  apiKey = null,
  idx = 0,
) {
  if (idx >= queue.length) {
    throw new Error(
      "Todos os modelos Gemini disponíveis estão com quota esgotada ou indisponíveis. " +
      "Aguarda alguns minutos e tenta novamente.",
    );
  }

  const model = queue[idx];
  console.log(`[Gemini Fallback] Modelo ${idx + 1}/${queue.length}: ${model}`);

  try {
    const key    = apiKey ?? process.env.GEMINI_API_KEY;
    const client = new GoogleGenAI({ apiKey: key });
    const chat   = client.chats.create({ model, history, config: chatConfig });
    const response = await chat.sendMessage({ message });

    if (idx > 0) {
      console.log(`[Gemini Fallback] ✓ Sucesso com modelo de fallback: ${model}`);
    }
    return { text: response.text, modelUsed: model };

  } catch (error) {
    if (isRetryableGeminiError(error)) {
      const reason = (error.message ?? "").substring(0, 80);
      console.warn(
        `[Gemini Fallback] ${model} indisponível — "${reason}". A tentar próximo modelo...`,
      );
      return sendWithModelFallback(chatConfig, history, message, queue, apiKey, idx + 1);
    }
    // Erros não-retryable (INVALID_REQUEST, autenticação, etc.) são relançados imediatamente
    throw error;
  }
}
