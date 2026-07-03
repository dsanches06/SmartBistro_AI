// Utilitários puros da Claude API — sem dependência do cliente ou de env vars

// ── Normaliza o texto visível de um array de content blocks ─────────────────
export function normalizeClaudeText(content) {
  if (!content) return "";
  if (typeof content === "string") return content;
  if (!Array.isArray(content)) return "";
  return content
    .filter((block) => block?.type === "text")
    .map((block) => block.text ?? "")
    .join("");
}

// ── Extrai chamadas de ferramenta (tool_use) de um array de content blocks ──
// O "input" de cada tool_use já vem como objecto parseado (sem JSON.parse).
export function extractClaudeToolUses(content) {
  if (!Array.isArray(content)) return [];
  return content
    .filter((block) => block?.type === "tool_use")
    .map((block) => ({
      name: block.name,
      args: block.input ?? {},
      raw: block,
    }));
}

// ── Normaliza declarações de tools para o formato input_schema da Claude API ─
export function normalizeClaudeTools(tools) {
  if (!Array.isArray(tools) || tools.length === 0) return undefined;

  return tools.map((tool) => {
    // Já no formato Claude
    if (tool.name && tool.input_schema) return tool;

    // Formato OpenAI/Groq legado: { type: "function", function: {...} }
    if (tool.type === "function" && tool.function) {
      return {
        name: tool.function.name,
        description: tool.function.description,
        input_schema: tool.function.parameters,
      };
    }

    // Formato simples: { name, description, parameters }
    if (tool.name && tool.parameters) {
      return {
        name: tool.name,
        description: tool.description,
        input_schema: tool.parameters,
      };
    }

    return tool;
  });
}

// ── Normaliza a resposta completa de uma chamada à Claude API ───────────────
export function normalizeClaudeResponse(response) {
  return {
    ...response,
    text: normalizeClaudeText(response?.content),
    thinking: null, // claude-haiku-4-5 não suporta extended thinking
    functionCalls: extractClaudeToolUses(response?.content),
  };
}

// ── Converte resultado de ferramenta para objecto JSON seguro ─────────────────
export function toResponsePayload(result) {
  if (Array.isArray(result)) return { items: result };
  if (result !== null && typeof result === "object") return result;
  return { result: result ?? null };
}
