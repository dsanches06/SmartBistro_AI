// ── Papéis na tabela `roles` ──────────────────────────────────────────────────
export const ROLE_USER      = 2;
export const ROLE_ASSISTANT = 3;

// ── Limite de passos agênticos por sessão de chatbot ─────────────────────────
export const MAX_AGENTIC_STEPS = 5;

// ── SSE helpers ───────────────────────────────────────────────────────────────

// Mapeia o tipo de erro classificado (classifyClaudeError) para o nome do evento SSE.
export const SSE_ERROR_EVENT = {
  RATE_LIMIT:      'rate_limit',
  SERVICE_DOWN:    'service_unavailable',
  AUTH_ERROR:      'auth_error',
  NETWORK_ERROR:   'network_error',
  INVALID_REQUEST: 'invalid_request',
};

// Devolve o nome do evento SSE correspondente ao erro, ou 'provider_error' por omissão.
export function sseErrorEvent(err) {
  const type = err?.aiErrorType;
  return SSE_ERROR_EVENT[type] ?? 'provider_error';
}

// Escreve um evento SSE "error" e termina a resposta — usado quando a IA falha a meio do stream.
export function writeSseError(res, err) {
  res.write(
    `event: ${sseErrorEvent(err)}\ndata: ${JSON.stringify({
      success:   false,
      errorType: err?.aiErrorType ?? 'UNKNOWN',
      message:   err.message,
    })}\n\n`,
  );
  res.end();
}
