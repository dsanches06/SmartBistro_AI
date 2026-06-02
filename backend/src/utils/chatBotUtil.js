import { GoogleGenAI } from "@google/genai";
import { PipelineError } from './pipelineError.js';
import { classifyGeminiError } from './classifyError.js';

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
  "gemini-2.5-flash",      // GA — rápido, estável, excelente para function calling
  "gemini-3.5-flash",      // Stable/Frontier — última geração
  "gemini-2.5-pro",        // GA — máxima capacidade (mais lento)
  "gemini-2.0-flash",      // fallback secundário
  "gemini-1.5-flash",      // último recurso
];

// ── Erros que justificam tentar o próximo modelo ──────────────────────────────
// 429 = RESOURCE_EXHAUSTED (quota/rate limit)
// 502 = Bad Gateway (proxy/Gemini overload, retryable)
// 503 = Service Unavailable (modelo sobrecarregado)
export function isRetryableGeminiError(error) {
  const msg    = (error?.message ?? "").toLowerCase();
  const status = Number(error?.status ?? error?.code ?? 0);
  return (
    error?.geminiType === 'TIMEOUT' ||
    status === 429 ||
    status === 502 ||
    status === 503 ||
    msg.includes("timeout") ||
    msg.includes("demorou demasiado") ||
    msg.includes("502") ||
    msg.includes("bad gateway") ||
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
    throw new PipelineError(
      "Todos os modelos Gemini disponíveis estão com quota esgotada ou indisponíveis. Aguarda alguns minutos e tenta novamente.",
      { code: 'MODEL_UNAVAILABLE', stage: 'provider', details: null },
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
    // Erros não-retryable (INVALID_REQUEST, autenticação, etc.) — encapsula em PipelineError para consistência
    if (error?.name === 'PipelineError' || error?.geminiType) throw error;
    const classified = classifyGeminiError(error);
    const pe = new PipelineError(classified.userMessage ?? (error?.message || 'Erro no provider'), {
      code: `GEMINI_${classified.type}`,
      stage: 'provider',
      details: { message: error?.message },
      cause: error,
    });
    pe.geminiType = classified.type;
    throw pe;
  }
}

// ── SSE helpers ───────────────────────────────────────────────────────────────

// Mapeia geminiType → nome do evento SSE enviado ao cliente
export const SSE_ERROR_EVENT = {
  RATE_LIMIT:      'rate_limit',
  SERVICE_DOWN:    'service_unavailable',
  AUTH_ERROR:      'auth_error',
  NETWORK_ERROR:   'network_error',
  INVALID_REQUEST: 'invalid_request',
};

export function sseErrorEvent(err) {
  return SSE_ERROR_EVENT[err?.geminiType] ?? 'provider_error';
}

export function writeSseError(res, err) {
  res.write(
    `event: ${sseErrorEvent(err)}\ndata: ${JSON.stringify({
      success:   false,
      errorType: err?.geminiType ?? 'UNKNOWN',
      message:   err.message,
    })}\n\n`,
  );
  res.end();
}
