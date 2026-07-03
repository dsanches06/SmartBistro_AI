import path from "path";
import { fileURLToPath } from "url";
import Anthropic from "@anthropic-ai/sdk";
import dotenv from "dotenv";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, "../../../.env.local") });
dotenv.config({ path: path.resolve(__dirname, "../../../.env") });

if (!process.env.ANTHROPIC_API_KEY) {
  console.error("ANTHROPIC_API_KEY is not defined in environment variables.");
  process.exit(1);
}

// Configurável via CLAUDE_MODEL no .env — trocar de modelo não requer alterar código.
export const CLAUDE_MODEL = process.env.CLAUDE_MODEL || "claude-haiku-4-5";

export const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// ── Chamada base ao Claude ───────────────────────────────────────────────────
// A SDK já faz retry automático em 429/5xx (max_retries=2), por isso não há
// aqui uma fila de modelos de fallback como havia no Groq — só um modelo.
export async function callClaude(messages, options = {}) {
  const { system, tools, temperature, max_tokens = 4096 } = options;

  return anthropic.messages.create({
    model: CLAUDE_MODEL,
    max_tokens,
    ...(system !== undefined ? { system } : {}),
    messages,
    ...(temperature !== undefined ? { temperature } : {}),
    ...(tools ? { tools } : {}),
  });
}
