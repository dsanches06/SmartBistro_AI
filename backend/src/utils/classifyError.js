// ── Error classifier ──────────────────────────────────────────────────────────
export function classifyGeminiError(error) {
  const msg = error?.message || "";
  const code = error?.status || error?.code || 0;

  if (code === 503 || msg.includes("503") || msg.toLowerCase().includes("service unavailable") || msg.toLowerCase().includes("overloaded"))
    return { type: "SERVICE_DOWN", userMessage: "O serviço de IA está temporariamente indisponível. Tente novamente em alguns instantes. 🔧" };

  if (code === 429 || msg.includes("429") || msg.toLowerCase().includes("quota") || msg.toLowerCase().includes("rate limit"))
    return { type: "RATE_LIMIT", userMessage: "Limite de pedidos atingido. Aguarde alguns segundos e tente novamente. ⏳" };

  if (code === 401 || code === 403 || msg.toLowerCase().includes("api key") || msg.toLowerCase().includes("permission denied"))
    return { type: "AUTH_ERROR", userMessage: "Erro de autenticação com o serviço de IA. Contacte o administrador. 🔑" };

  if (msg.toLowerCase().includes("timeout") || msg.toLowerCase().includes("econnrefused") || msg.toLowerCase().includes("fetch failed"))
    return { type: "NETWORK_ERROR", userMessage: "Não foi possível ligar ao serviço de IA. Verifique a sua ligação à internet. 🌐" };

  if (code === 400 || msg.includes("400") || msg.toLowerCase().includes("invalid"))
    return { type: "INVALID_REQUEST", userMessage: "O pedido não pôde ser processado. Tente reformular a mensagem. ✏️" };

  return { type: "UNKNOWN", userMessage: "O assistente de IA não está disponível de momento. Tente novamente. 🤖" };
}