// Utilitários puros do Groq — sem dependência do cliente ou de env vars

// ── Erros que justificam tentar o próximo modelo ──────────────────────────────
export function isRetryableGroqError(error) {
  const msg    = (error?.message ?? "").toLowerCase();
  const status = Number(error?.status ?? error?.code ?? 0);
  return (
    error?.groqType === 'TIMEOUT' ||
    status === 413 ||  // context too large para este modelo — tentar o próximo
    status === 429 ||
    status === 502 ||
    status === 503 ||
    msg.includes("timeout") ||
    msg.includes("demorou demasiado") ||
    msg.includes("502") ||
    msg.includes("bad gateway") ||
    msg.includes("quota") ||
    msg.includes("rate limit") ||
    msg.includes("overloaded") ||
    msg.includes("unavailable") ||
    msg.includes("too many requests") ||
    // Alguns modelos de fallback passam tipos errados ou não suportam tool calling
    msg.includes("tool call validation failed") ||
    msg.includes("tool calling` is not supported") ||
    msg.includes("tool_calls is not supported")
  );
}

// Devolve true se o modelo suporta reasoning_effort (modelos OpenAI na Groq)
export function supportsReasoningEffort(model = "") {
  return model.startsWith("openai/");
}

// ── Normalização de tools para formato OpenAI ────────────────────────────────
export function normalizeGroqTools(tools) {
  if (!Array.isArray(tools) || tools.length === 0) return undefined;

  return tools.map((tool) => {
    if (tool.type === "function" && tool.function) return tool;

    if (tool.name && tool.parameters) {
      return {
        type: "function",
        function: {
          name: tool.name,
          description: tool.description,
          parameters: tool.parameters,
        },
      };
    }

    return { type: "function", ...tool };
  });
}

// ── Parse de argumentos de função ───────────────────────────────────────────
export function parseGroqFunctionArgs(rawArgs) {
  if (rawArgs == null) return null;
  if (typeof rawArgs === "object") return rawArgs;
  if (typeof rawArgs === "string") {
    try {
      return JSON.parse(rawArgs);
    } catch {
      return rawArgs;
    }
  }
  return rawArgs;
}

// ── Extrai chamadas de função de uma mensagem ────────────────────────────────
export function extractGroqFunctionCalls(message) {
  if (!message || typeof message !== "object") return [];

  const candidates = [];
  if (message.function_call) candidates.push(message.function_call);
  if (Array.isArray(message.tool_calls)) candidates.push(...message.tool_calls);

  return candidates
    .filter((tool) => tool && typeof tool === "object")
    .map((tool) => {
      const fn = tool.function || tool;
      // Alguns modelos Groq/OpenAI appendem "<|channel|>commentary" ao nome da tool.
      // Removemos tudo a partir de "<|" para obter o nome limpo.
      const rawName = fn.name ?? "";
      const name = rawName.replace(/<\|.*$/, "").trim() || null;
      return {
        name,
        args: parseGroqFunctionArgs(fn.arguments ?? fn.args),
        raw: tool,
      };
    })
    .filter((tool) => tool.name);
}

// ── Separa <think>…</think> do texto visível ─────────────────────────────────
export function extractThinking(rawText) {
  const thoughts = [];
  const text = (rawText || "")
    .replace(/<think>([\s\S]*?)<\/think>/gi, (_, c) => {
      thoughts.push(c.trim());
      return "";
    })
    .trim();
  return { text, thinking: thoughts.length ? thoughts.join("\n\n") : null };
}

// ── Normaliza texto de uma mensagem Groq ─────────────────────────────────────
export function normalizeGroqText(message) {
  if (!message) return "";
  const { content } = message;
  if (typeof content === "string") return content;
  if (Array.isArray(content)) {
    return content
      .map((part) => {
        if (part == null) return "";
        if (typeof part === "string") return part;
        if (typeof part === "object") return part.text ?? JSON.stringify(part);
        return String(part);
      })
      .join("");
  }
  if (typeof content === "object" && content !== null)
    return content.text || JSON.stringify(content);
  return String(message.text || "");
}

// ── Normaliza a resposta completa de uma chamada Groq ───────────────────────
export function normalizeGroqResponse(response) {
  const choice          = response?.choices?.[0] || {};
  const assistantMessage = choice.message || {};

  const { text, thinking: thinkFromTags } = extractThinking(
    normalizeGroqText(assistantMessage),
  );
  const reasoningField =
    assistantMessage.reasoning_content || assistantMessage.reasoning || null;
  const thinking =
    thinkFromTags ||
    (reasoningField ? String(reasoningField).trim() : null) ||
    null;

  return {
    ...response,
    text,
    thinking,
    functionCalls: extractGroqFunctionCalls(assistantMessage),
  };
}

// ── Filtro de <think> em streaming (emite apenas texto visível via onChunk) ──
export function createThinkTagFilter(onChunk) {
  const OPEN  = "<think>";
  const CLOSE = "</think>";
  let buf          = "";
  let inThink      = false;
  let thinkContent = "";

  const emit = (text) => { if (text) onChunk(text); };

  const feed = (incoming) => {
    buf += incoming;
    let visible = "";

    while (true) {
      if (inThink) {
        const closeIdx = buf.indexOf(CLOSE);
        if (closeIdx !== -1) {
          thinkContent += buf.slice(0, closeIdx);
          buf = buf.slice(closeIdx + CLOSE.length);
          inThink = false;
        } else {
          const safeLen = Math.max(0, buf.length - CLOSE.length + 1);
          thinkContent += buf.slice(0, safeLen);
          buf = buf.slice(safeLen);
          break;
        }
      } else {
        const openIdx = buf.indexOf(OPEN);
        if (openIdx !== -1) {
          visible += buf.slice(0, openIdx);
          buf = buf.slice(openIdx + OPEN.length);
          inThink = true;
        } else {
          const safeLen = Math.max(0, buf.length - OPEN.length + 1);
          visible += buf.slice(0, safeLen);
          buf = buf.slice(safeLen);
          break;
        }
      }
    }

    emit(visible);
  };

  const finalize = () => {
    if (!inThink && buf) emit(buf);
    buf = "";
    return thinkContent.trim() || null;
  };

  return { feed, finalize };
}

// ── Converte resultado de ferramenta para objecto JSON seguro ─────────────────
export function toResponsePayload(result) {
  if (Array.isArray(result)) return { items: result };
  if (result !== null && typeof result === "object") return result;
  return { result: result ?? null };
}
