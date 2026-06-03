import { PipelineError } from './pipelineError.js';

// ── Mapeamento temperatura → reasoning_effort ─────────────────────────────────
// temp 0.0–0.3 → low   (tarefas precisas/determinísticas)
// temp 0.3–0.7 → medium (tarefas equilibradas)
// temp 0.7–1.0 → high  (tarefas criativas/complexas)
// O valor devolvido é usado directamente como reasoning_effort na API Groq.
export function getThinkingLevel(temp) {
  const t = Number(temp);
  if (isNaN(t) || t <= 0.3) return "low";
  if (t <= 0.7) return "medium";
  return "high";
}

// Monta opções de raciocínio para a chamada Groq.
// chatWithFallback filtra reasoning_effort para modelos que não o suportam.
export function buildThinkingConfig(options = {}, temp = 0.3) {
  const hasLevel  = options.thinkingLevel  !== undefined;
  const hasBudget = options.thinkingBudget !== undefined;

  if (hasLevel && hasBudget) {
    throw new PipelineError(
      "buildThinkingConfig: usa apenas thinkingLevel ou thinkingBudget, não ambos.",
      { code: 'INVALID_ARGUMENT', stage: 'config', details: null },
    );
  }

  // Converte budget (número legado) → nível equivalente
  let level;
  if (hasBudget) {
    const budget = Number(options.thinkingBudget);
    level = budget <= 1024 ? "low" : budget <= 8192 ? "medium" : "high";
  } else {
    level = hasLevel ? options.thinkingLevel : getThinkingLevel(temp);
  }

  return { reasoning_effort: level };
}

// Extrai pensamento e texto final de uma resposta Groq normalizada.
export function parseThinkingResponse(response) {
  return {
    text:    response?.text    ?? "",
    thoughts: response?.thinking ?? null,
  };
}
