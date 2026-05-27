// URL base do backend — usada pelas funções do agente para consultar dados financeiros
export const BACKEND_URL =
  process.env.BACKEND_URL ?? `http://localhost:${process.env.PORT ?? 3000}`;
