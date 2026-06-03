const _TIMEOUT_MSG = "O assistente demorou demasiado tempo a responder. Tente novamente. ⏱️";

// ── Error classifier — compatível com groq-sdk ───────────────────────────────
export function classifyGroqError(error) {
  // Erros já classificados internamente (ex: TIMEOUT de makeTimeout)
  if (error?.groqType) {
    const map = {
      TIMEOUT:         { type: "TIMEOUT",         userMessage: _TIMEOUT_MSG },
      RATE_LIMIT:      { type: "RATE_LIMIT",      userMessage: "Limite de pedidos atingido. Aguarde alguns segundos e tente novamente. ⏳" },
      SERVICE_DOWN:    { type: "SERVICE_DOWN",    userMessage: "O serviço de IA está temporariamente indisponível. Tente novamente em alguns instantes. 🔧" },
      AUTH_ERROR:      { type: "AUTH_ERROR",      userMessage: "Erro de autenticação com o serviço de IA. Contacte o administrador. 🔑" },
      NETWORK_ERROR:   { type: "NETWORK_ERROR",   userMessage: "Não foi possível ligar ao serviço de IA. Verifique a sua ligação à internet. 🌐" },
      INVALID_REQUEST: { type: "INVALID_REQUEST", userMessage: "O pedido não pôde ser processado. Tente reformular a mensagem. ✏️" },
    };
    return map[error.groqType] ?? { type: error.groqType, userMessage: error.message };
  }

  const msg    = (error?.message || "").toLowerCase();
  const status = error?.status || error?.httpStatus || error?.code || 0;

  console.error("[Groq Error]", {
    status,
    message: error?.message,
    constructor: error?.constructor?.name,
  });

  // ── 503 / Service Unavailable / Overloaded ────────────────────────────────
  if (
    status === 503 ||
    msg.includes("503") ||
    msg.includes("service unavailable") ||
    msg.includes("overloaded")
  ) return { type: "SERVICE_DOWN", userMessage: "O serviço de IA está temporariamente indisponível. Tente novamente em alguns instantes. 🔧" };

  // ── 429 / Rate Limit / Quota Exceeded ─────────────────────────────────────
  if (
    status === 429 ||
    msg.includes("429") ||
    msg.includes("quota") ||
    msg.includes("rate limit") ||
    msg.includes("too many requests")
  ) return { type: "RATE_LIMIT", userMessage: "Limite de pedidos atingido. Aguarde alguns segundos e tente novamente. ⏳" };

  // ── 401 / 403 / Auth / Invalid API Key ────────────────────────────────────
  if (
    status === 401 ||
    status === 403 ||
    msg.includes("api key") ||
    msg.includes("permission denied") ||
    msg.includes("unauthenticated") ||
    msg.includes("invalid key")
  ) return { type: "AUTH_ERROR", userMessage: "Erro de autenticação com o serviço de IA. Contacte o administrador. 🔑" };

  // ── Network / Timeout / Connection ────────────────────────────────────────
  if (
    msg.includes("timeout") ||
    msg.includes("econnrefused") ||
    msg.includes("fetch failed") ||
    msg.includes("network error") ||
    msg.includes("socket hang up")
  ) return { type: "NETWORK_ERROR", userMessage: "Não foi possível ligar ao serviço de IA. Verifique a sua ligação à internet. 🌐" };

  // ── 400 / Invalid Request ─────────────────────────────────────────────────
  if (
    status === 400 ||
    msg.includes("400") ||
    msg.includes("invalid argument") ||
    msg.includes("bad request")
  ) return { type: "INVALID_REQUEST", userMessage: "O pedido não pôde ser processado. Tente reformular a mensagem. ✏️" };

  return { type: "UNKNOWN", userMessage: "O assistente de IA não está disponível de momento. Tente novamente. 🤖" };
}
