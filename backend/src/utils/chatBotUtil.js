// ── Papéis na tabela `roles` ──────────────────────────────────────────────────
export const ROLE_USER      = 2;
export const ROLE_ASSISTANT = 3;

// ── Limite de passos agênticos por sessão de chatbot ─────────────────────────
export const MAX_AGENTIC_STEPS = 5;

// ── SSE helpers ───────────────────────────────────────────────────────────────

export const SSE_ERROR_EVENT = {
  RATE_LIMIT:      'rate_limit',
  SERVICE_DOWN:    'service_unavailable',
  AUTH_ERROR:      'auth_error',
  NETWORK_ERROR:   'network_error',
  INVALID_REQUEST: 'invalid_request',
};

export function sseErrorEvent(err) {
  const type = err?.aiErrorType;
  return SSE_ERROR_EVENT[type] ?? 'provider_error';
}

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
