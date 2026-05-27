import { ThinkingLevel } from "@google/genai";

// Retorna o nível de pensamento com base na temperatura
// temp 0.0–0.3 → LOW  (tarefas precisas/determinísticas)
// temp 0.3–0.7 → MEDIUM (tarefas equilibradas)
// temp 0.7–1.0 → HIGH  (tarefas criativas/complexas)
export function getThinkingLevel(temp) {
  const normalizedTemp = Number(temp);
  if (isNaN(normalizedTemp)) return ThinkingLevel.LOW;
  return normalizedTemp <= 0.3
    ? ThinkingLevel.LOW
    : normalizedTemp <= 0.7
      ? ThinkingLevel.MEDIUM
      : ThinkingLevel.HIGH;
}

// Mapeamento ThinkingLevel → thinkingBudget (tokens)
// A API Gemini aceita thinkingBudget (número), não thinkingLevel (enum)
//   -1 = dinâmico (modelo decide)
//    0 = sem thinking
//   N+ = orçamento fixo em tokens
const THINKING_BUDGET_MAP = {
  [ThinkingLevel.LOW]:    1024,
  [ThinkingLevel.MEDIUM]: 8192,
  [ThinkingLevel.HIGH]:   24576,
};

// Monta a configuração de thinking — usa sempre thinkingBudget (campo válido na API)
// Aceita thinkingLevel (enum) ou thinkingBudget (número) nas options; nunca ambos
export function buildThinkingConfig(options = {}, temp = 0.3) {
  const hasLevel  = options.thinkingLevel  !== undefined;
  const hasBudget = options.thinkingBudget !== undefined;

  if (hasLevel && hasBudget) {
    throw new Error(
      "buildThinkingConfig: usa apenas thinkingLevel ou thinkingBudget, não ambos.",
    );
  }

  // Budget explícito tem prioridade
  if (hasBudget) {
    return { includeThoughts: true, thinkingBudget: options.thinkingBudget };
  }

  // Converte ThinkingLevel → thinkingBudget
  const level  = hasLevel ? options.thinkingLevel : getThinkingLevel(temp);
  const budget = THINKING_BUDGET_MAP[level] ?? 1024;

  return { includeThoughts: true, thinkingBudget: budget };
}

// Extrai thoughts e text final das partes da resposta
export function parseThinkingResponse(response) {
  const parts = response.candidates?.[0]?.content?.parts ?? [];
  const thoughts = parts
    .filter((p) => p.text && p.thought)
    .map((p) => p.text)
    .join("\n");
  const text =
    parts.find((p) => p.text && !p.thought)?.text ??
    parts.map((p) => p.text).join("\n");
  return { text, thoughts };
}
