// ── Error classifier — compatível com @google/genai SDK v2 ────────────────────
export function classifyGeminiError(error) {
  // Normaliza campos do SDK v2 (@google/genai) e do SDK legacy (@google/generative-ai)
  const msg  = (
    error?.message ||
    error?.errorDetails?.[0]?.message ||
    error?.error?.message ||
    ""
  ).toLowerCase();

  // status pode ser HTTP int (429), string gRPC ("RESOURCE_EXHAUSTED") ou code int
  const httpStatus  = error?.status || error?.httpStatus || error?.code || 0;
  const grpcStatus  = (error?.statusText || error?.error?.status || "").toLowerCase();

  // Log completo para debugging (visível nos logs do servidor)
  console.error("[Gemini Error]", {
    httpStatus,
    grpcStatus,
    message: error?.message,
    constructor: error?.constructor?.name,
  });

  // ── 503 / Service Unavailable / Overloaded ────────────────────────────────
  if (
    httpStatus === 503 ||
    grpcStatus.includes("unavailable") ||
    msg.includes("503") ||
    msg.includes("service unavailable") ||
    msg.includes("overloaded") ||
    msg.includes("the model is overloaded")
  ) return { type: "SERVICE_DOWN", userMessage: "O serviço de IA está temporariamente indisponível. Tente novamente em alguns instantes. 🔧" };

  // ── 429 / Rate Limit / Quota Exceeded ─────────────────────────────────────
  if (
    httpStatus === 429 ||
    grpcStatus.includes("resource_exhausted") ||
    msg.includes("429") ||
    msg.includes("quota") ||
    msg.includes("rate limit") ||
    msg.includes("resource_exhausted") ||
    msg.includes("too many requests")
  ) return { type: "RATE_LIMIT", userMessage: "Limite de pedidos atingido. Aguarde alguns segundos e tente novamente. ⏳" };

  // ── 401 / 403 / Auth / Invalid API Key ────────────────────────────────────
  if (
    httpStatus === 401 ||
    httpStatus === 403 ||
    grpcStatus.includes("unauthenticated") ||
    grpcStatus.includes("permission_denied") ||
    msg.includes("api key") ||
    msg.includes("api_key") ||
    msg.includes("permission denied") ||
    msg.includes("unauthenticated") ||
    msg.includes("not valid") ||
    msg.includes("invalid key")
  ) return { type: "AUTH_ERROR", userMessage: "Erro de autenticação com o serviço de IA. Contacte o administrador. 🔑" };

  // ── Network / Timeout / Connection ────────────────────────────────────────
  if (
    msg.includes("timeout") ||
    msg.includes("econnrefused") ||
    msg.includes("fetch failed") ||
    msg.includes("network error") ||
    msg.includes("enotfound") ||
    msg.includes("socket hang up")
  ) return { type: "NETWORK_ERROR", userMessage: "Não foi possível ligar ao serviço de IA. Verifique a sua ligação à internet. 🌐" };

  // ── 400 / Invalid Request ─────────────────────────────────────────────────
  if (
    httpStatus === 400 ||
    grpcStatus.includes("invalid_argument") ||
    msg.includes("400") ||
    msg.includes("invalid argument") ||
    msg.includes("bad request")
  ) return { type: "INVALID_REQUEST", userMessage: "O pedido não pôde ser processado. Tente reformular a mensagem. ✏️" };

  return { type: "UNKNOWN", userMessage: "O assistente de IA não está disponível de momento. Tente novamente. 🤖" };
}