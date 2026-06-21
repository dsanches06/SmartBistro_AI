// IDs dos modelos disponíveis no Groq (actualizados em Junho 2026).
// Llama 3.3-70b, Llama 3.1-8b, Llama 4 Scout e Llama 4 Maverick depreciados/inexistentes.
// Cada agente usa a sua própria fila — GROQ_MODEL_QUEUE é fallback de segurança.
export const GROQ_MODELS = {
  QWEN3_32B:    "qwen/qwen3-32b",        // principal — reasoning sólido, latência aceitável
  QWEN3_27B:    "qwen/qwen3.6-27b",      // variante Qwen3 mais recente
  GPT_OSS_20B:  "openai/gpt-oss-20b",    // rápido (1000 T/s no Groq)
  GPT_OSS_120B: "openai/gpt-oss-120b",   // robusto (500 T/s no Groq)
  WHISPER_V3:   "whisper-large-v3",      // áudio — API de transcrição separada
};

// Fila global de segurança — usada quando um agente não tem agentKey definida.
export const GROQ_MODEL_QUEUE = [
  GROQ_MODELS.QWEN3_32B,
  GROQ_MODELS.QWEN3_27B,
  GROQ_MODELS.GPT_OSS_20B,
  GROQ_MODELS.GPT_OSS_120B,
];

// Fila dedicada por agente — cada um começa no modelo mais adequado ao seu papel.
export const AGENT_MODEL_QUEUES = {
  // Maître: validação de pedidos — reasoning primeiro
  maitre:    [GROQ_MODELS.QWEN3_32B,   GROQ_MODELS.QWEN3_27B,   GROQ_MODELS.GPT_OSS_20B,  GROQ_MODELS.GPT_OSS_120B],
  // Chef: cozinha — Qwen alternado
  chef:      [GROQ_MODELS.QWEN3_27B,   GROQ_MODELS.QWEN3_32B,   GROQ_MODELS.GPT_OSS_20B,  GROQ_MODELS.GPT_OSS_120B],
  // Cashier: fatura — precisão financeira
  cashier:   [GROQ_MODELS.QWEN3_32B,   GROQ_MODELS.GPT_OSS_120B, GROQ_MODELS.QWEN3_27B,   GROQ_MODELS.GPT_OSS_20B],
  // Analytics: recomendações e previsões
  analytics: [GROQ_MODELS.QWEN3_27B,   GROQ_MODELS.QWEN3_32B,   GROQ_MODELS.GPT_OSS_120B, GROQ_MODELS.GPT_OSS_20B],
  // Chatbot: conversação — GPT-20B primeiro (mais rápido para respostas ao cliente)
  chatbot:   [GROQ_MODELS.GPT_OSS_20B, GROQ_MODELS.QWEN3_32B,   GROQ_MODELS.QWEN3_27B,   GROQ_MODELS.GPT_OSS_120B],
};

// Mantido por retrocompatibilidade — pode ser removido quando confirmarmos que nenhum código o usa directamente.
export const GROQ_MODEL = GROQ_MODELS.QWEN3_32B;
