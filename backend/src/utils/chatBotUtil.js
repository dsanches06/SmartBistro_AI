// ── Papéis na tabela `roles` ──────────────────────────────────────────────────
export const ROLE_USER      = 2;
export const ROLE_ASSISTANT = 3;

// ── Limite de passos agênticos por sessão de chatbot ─────────────────────────
export const MAX_AGENTIC_STEPS = 5;

// Modelos que suportam reasoning_effort (OpenAI na Groq)
// Os restantes usam <think> tags (qwen3) ou não têm raciocínio explícito
export const THINKING_CAPABLE_MODELS = new Set([
  "openai/gpt-oss-120b",
  "openai/gpt-oss-20b",
]);

// Alias para compatibilidade — a lógica real está em groqUtil.isRetryableGroqError
export { isRetryableGroqError as isRetryableGeminiError } from './groqUtil.js';

// ── SSE helpers ───────────────────────────────────────────────────────────────

export const SSE_ERROR_EVENT = {
  RATE_LIMIT:      'rate_limit',
  SERVICE_DOWN:    'service_unavailable',
  AUTH_ERROR:      'auth_error',
  NETWORK_ERROR:   'network_error',
  INVALID_REQUEST: 'invalid_request',
};

export function sseErrorEvent(err) {
  const type = err?.groqType ?? err?.geminiType;
  return SSE_ERROR_EVENT[type] ?? 'provider_error';
}

export function writeSseError(res, err) {
  res.write(
    `event: ${sseErrorEvent(err)}\ndata: ${JSON.stringify({
      success:   false,
      errorType: err?.groqType ?? err?.geminiType ?? 'UNKNOWN',
      message:   err.message,
    })}\n\n`,
  );
  res.end();
}
