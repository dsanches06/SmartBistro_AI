// Mensagem partilhada para qualquer erro classificado como TIMEOUT.
const _TIMEOUT_MSG = "O assistente demorou demasiado tempo a responder. Tente novamente. ⏱️";

// ── Error classifier — compatível com @anthropic-ai/sdk ─────────────────────
export function classifyClaudeError(error) {
  // Erros já classificados internamente (ex: TIMEOUT de makeTimeout)
  if (error?.aiErrorType) {
    const map = {
      TIMEOUT:         { type: "TIMEOUT",         userMessage: _TIMEOUT_MSG },
      RATE_LIMIT:      { type: "RATE_LIMIT",      userMessage: "Limite de pedidos atingido. Aguarde alguns segundos e tente novamente. ⏳" },
      SERVICE_DOWN:    { type: "SERVICE_DOWN",    userMessage: "O serviço de IA está temporariamente indisponível. Tente novamente em alguns instantes. 🔧" },
      AUTH_ERROR:      { type: "AUTH_ERROR",      userMessage: "Erro de autenticação com o serviço de IA. Contacte o administrador. 🔑" },
      NETWORK_ERROR:   { type: "NETWORK_ERROR",   userMessage: "Não foi possível ligar ao serviço de IA. Verifique a sua ligação à internet. 🌐" },
      INVALID_REQUEST: { type: "INVALID_REQUEST", userMessage: "O pedido não pôde ser processado. Tente reformular a mensagem. ✏️" },
    };
    return map[error.aiErrorType] ?? { type: error.aiErrorType, userMessage: error.message };
  }

  // A SDK da Anthropic expõe `.status` (HTTP) e `.type` (ex: "rate_limit_error",
  // "overloaded_error", "authentication_error") directamente nos erros da API.
  const apiType = error?.error?.type || error?.type || "";
  const msg      = (error?.message || "").toLowerCase();
  const status   = error?.status || error?.status_code || error?.code || 0;

  console.error("[Claude Error]", {
    status,
    apiType,
    message: error?.message,
    constructor: error?.constructor?.name,
  });

  // ── 529 / 503 / Service Unavailable / Overloaded ──────────────────────────
  if (
    status === 529 ||
    status === 503 ||
    apiType === "overloaded_error" ||
    msg.includes("529") ||
    msg.includes("503") ||
    msg.includes("service unavailable") ||
    msg.includes("overloaded")
  ) return { type: "SERVICE_DOWN", userMessage: "O serviço de IA está temporariamente indisponível. Tente novamente em alguns instantes. 🔧" };

  // ── 429 / Rate Limit ───────────────────────────────────────────────────────
  if (
    status === 429 ||
    apiType === "rate_limit_error" ||
    msg.includes("429") ||
    msg.includes("rate limit") ||
    msg.includes("too many requests")
  ) return { type: "RATE_LIMIT", userMessage: "Limite de pedidos atingido. Aguarde alguns segundos e tente novamente. ⏳" };

  // ── 401 / 403 / Auth / Invalid API Key ────────────────────────────────────
  if (
    status === 401 ||
    status === 403 ||
    apiType === "authentication_error" ||
    apiType === "permission_error" ||
    msg.includes("api key") ||
    msg.includes("permission denied") ||
    msg.includes("unauthenticated") ||
    msg.includes("invalid key") ||
    msg.includes("invalid x-api-key")
  ) return { type: "AUTH_ERROR", userMessage: "Erro de autenticação com o serviço de IA. Contacte o administrador. 🔑" };

  // ── Network / Timeout / Connection ────────────────────────────────────────
  if (
    error?.constructor?.name === "APIConnectionError" ||
    msg.includes("timeout") ||
    msg.includes("econnrefused") ||
    msg.includes("fetch failed") ||
    msg.includes("network error") ||
    msg.includes("socket hang up")
  ) return { type: "NETWORK_ERROR", userMessage: "Não foi possível ligar ao serviço de IA. Verifique a sua ligação à internet. 🌐" };

  // ── 400 / Invalid Request ─────────────────────────────────────────────────
  if (
    status === 400 ||
    apiType === "invalid_request_error" ||
    msg.includes("400") ||
    msg.includes("invalid argument") ||
    msg.includes("bad request")
  ) return { type: "INVALID_REQUEST", userMessage: "O pedido não pôde ser processado. Tente reformular a mensagem. ✏️" };

  return { type: "UNKNOWN", userMessage: "O assistente de IA não está disponível de momento. Tente novamente. 🤖" };
}
