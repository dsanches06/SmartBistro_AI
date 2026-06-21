// IDs dos modelos disponíveis no Groq.
export const GROQ_MODELS = {
  LLAMA33_70B:     "llama-3.3-70b-versatile",                        // melhor para function calling
  LLAMA4_SCOUT:    "meta-llama/llama-4-scout-17b-16e-instruct",      // ultra-rápido, tarefas ágeis
  LLAMA4_MAVERICK: "meta-llama/llama-4-maverick-17b-128e-instruct",  // multimodal texto + imagens
  K2:              "moonshotai/kimi-k2-instruct",                    // robusto para texto
  QWEN3_32B:       "qwen/qwen3-32b",                                  // raciocínio via <think>
  LLAMA31_8B:      "llama-3.1-8b-instant",                            // fallback leve
  WHISPER_V3:      "whisper-large-v3",                                // áudio — API de transcrição separada
};

// Modelo padrão — configurável por variável de ambiente.
export const GROQ_MODEL =
  process.env.GROQ_MODEL ||
  process.env.GROQ_MODEL_NAME ||
  GROQ_MODELS.LLAMA33_70B;

// Fila global de fallback — usada quando um agente não tem fila própria.
export const GROQ_MODEL_QUEUE = [
  GROQ_MODEL,
  ...[
    GROQ_MODELS.LLAMA33_70B,
    GROQ_MODELS.LLAMA4_SCOUT,
    GROQ_MODELS.LLAMA4_MAVERICK,
    GROQ_MODELS.K2,
    GROQ_MODELS.QWEN3_32B,
    GROQ_MODELS.LLAMA31_8B,
  ].filter((m) => m !== GROQ_MODEL),
];

// Filas por agente — cada agente começa no seu modelo preferido.
// Agentes diferentes usam modelos diferentes como 1.º → menos competição por rate limit.
export const AGENT_MODEL_QUEUES = {
  // Maître: validação complexa de pedidos — reasoning primeiro
  maitre:    [GROQ_MODELS.LLAMA33_70B,     GROQ_MODELS.K2,              GROQ_MODELS.QWEN3_32B,      GROQ_MODELS.LLAMA4_SCOUT,    GROQ_MODELS.LLAMA4_MAVERICK, GROQ_MODELS.LLAMA31_8B],
  // Chef: sequência de cozinha — velocidade primeiro
  chef:      [GROQ_MODELS.LLAMA4_SCOUT,    GROQ_MODELS.LLAMA33_70B,     GROQ_MODELS.LLAMA4_MAVERICK, GROQ_MODELS.K2,             GROQ_MODELS.QWEN3_32B,      GROQ_MODELS.LLAMA31_8B],
  // Manager: relatórios e alertas — raciocínio analítico primeiro
  manager:   [GROQ_MODELS.QWEN3_32B,       GROQ_MODELS.LLAMA33_70B,     GROQ_MODELS.K2,             GROQ_MODELS.LLAMA4_SCOUT,    GROQ_MODELS.LLAMA4_MAVERICK, GROQ_MODELS.LLAMA31_8B],
  // Analytics: recomendações e previsões — texto robusto primeiro
  analytics: [GROQ_MODELS.K2,              GROQ_MODELS.LLAMA4_MAVERICK,  GROQ_MODELS.QWEN3_32B,     GROQ_MODELS.LLAMA33_70B,     GROQ_MODELS.LLAMA4_SCOUT,   GROQ_MODELS.LLAMA31_8B],
  // Chatbot: conversação com clientes — multimodal primeiro
  chatbot:   [GROQ_MODELS.LLAMA4_MAVERICK, GROQ_MODELS.LLAMA4_SCOUT,    GROQ_MODELS.LLAMA33_70B,   GROQ_MODELS.K2,              GROQ_MODELS.QWEN3_32B,      GROQ_MODELS.LLAMA31_8B],
};
