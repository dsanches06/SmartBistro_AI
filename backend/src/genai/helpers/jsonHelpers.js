import { PipelineError } from "../../utils/pipelineError.js";

function validateAgentOutput(schema, value, agentName) {
  const result = schema.safeParse(value);
  if (!result.success) {
    const issues = result.error.issues.map((issue) => ({
      path: issue.path,
      message: issue.message,
    }));
    const details = { issues };
    throw new PipelineError(
      `[${agentName}] Resposta inválida: ${result.error.message}`,
      {
        code: "AGENT_VALIDATION",
        stage: "agent_validation",
        details,
      },
    );
  }
  return result.data;
}

function repairBrackets(str) {
  const stack = [];
  let inStr = false;
  let result = "";

  for (let i = 0; i < str.length; i++) {
    const ch = str[i];
    const prev = i > 0 ? str[i - 1] : "";

    if (ch === '"' && prev !== "\\") {
      inStr = !inStr;
      result += ch;
      continue;
    }
    if (inStr) {
      result += ch;
      continue;
    }

    if (ch === "{") {
      stack.push("}");
      result += ch;
    } else if (ch === "[") {
      stack.push("]");
      result += ch;
    } else if (ch === "}" || ch === "]") {
      if (stack.length > 0) {
        result += stack.pop();
      }
    } else {
      result += ch;
    }
  }
  while (stack.length) result += stack.pop();
  return result;
}

function sanitiseJSON(str) {
  return repairBrackets(
    str
      .replace(/,\s*([\]}])/g, "$1")
      .replace(/\/\/[^\n]*/g, "")
      .replace(/\/\*[\s\S]*?\*\//g, ""),
  ).trim();
}

function extractJSON(text, agentName = "agent") {
  if (!text)
    throw new PipelineError(`[${agentName}] Resposta vazia.`, {
      code: "JSON_EXTRACT",
      stage: "json_extraction",
      details: null,
    });

  const tryParse = (raw) => {
    try {
      return JSON.parse(raw);
    } catch {}
    try {
      return JSON.parse(sanitiseJSON(raw));
    } catch {}
    return null;
  };

  const block = text.match(/```(?:json)?\s*([\s\S]*?)```/s);
  if (block) {
    const result = tryParse(block[1].trim());
    if (result) return result;
  }

  const trimmed = text.trim();
  if (trimmed.startsWith("{") || trimmed.startsWith("[")) {
    const result = tryParse(trimmed);
    if (result) return result;
  }

  const objMatch = text.match(/\{[\s\S]*\}/);
  if (objMatch) {
    const result = tryParse(objMatch[0]);
    if (result) return result;
  }

  // Tenta extrair um array JSON embebido no texto (ex: recomendações)
  const arrMatch = text.match(/\[[\s\S]*\]/);
  if (arrMatch) {
    const result = tryParse(arrMatch[0]);
    if (result) return result;
  }

  throw new PipelineError(
    `[${agentName}] Não foi possível extrair JSON da resposta.`,
    {
      code: "JSON_EXTRACT",
      stage: "json_extraction",
      details: { preview: text.substring(0, 400) },
    },
  );
}

export { validateAgentOutput, extractJSON };
