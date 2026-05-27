import { ThinkingLevel } from "@google/genai";

// Retorna o nível de pensamento com base na temperatura
// temp 0.0–0.3 → LOW  (tarefas precisas/determinísticas)
// temp 0.3–0.7 → MEDIUM (tarefas equilibradas)
// temp 0.7–1.0 → HIGH  (tarefas criativas/complexas)
export function getThinkingLevel(temp) {
  const normalizedTemp = Number(temp);
  if (isNaN(normalizedTemp)) return ThinkingLevel.LOW; // fallback seguro
  return normalizedTemp <= 0.3
    ? ThinkingLevel.LOW
    : normalizedTemp <= 0.7
      ? ThinkingLevel.MEDIUM
      : ThinkingLevel.HIGH;
}

// Monta a configuração de thinking — aceita thinkingLevel ou thinkingBudget (não ambos)
export function buildThinkingConfig(options = {}, temp = 0.3) {
  const hasLevel = options.thinkingLevel !== undefined;
  const hasBudget = options.thinkingBudget !== undefined;

  if (hasLevel && hasBudget) {
    throw new Error(
      "thinkingConfig deve usar apenas thinkingLevel ou thinkingBudget, não ambos."
    );
  }

  const config = { includeThoughts: true };

  if (hasLevel) {
    config.thinkingLevel = options.thinkingLevel;
  } else if (hasBudget) {
    config.thinkingBudget = options.thinkingBudget;
  } else {
    config.thinkingLevel = getThinkingLevel(temp);
  }

  return config;
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
