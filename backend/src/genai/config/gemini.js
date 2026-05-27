import path from "path";
import { fileURLToPath } from "url";
import { GoogleGenAI, FunctionCallingConfigMode } from "@google/genai";
import dotenv from "dotenv";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, "../../../.env.local") });
dotenv.config({ path: path.resolve(__dirname, "../../../.env") });

if (!process.env.GEMINI_API_KEY) {
  console.error("GEMINI_API_KEY is not defined in environment variables.");
  process.exit(1);
}

if (!process.env.MODEL_NAME) {
  console.error("MODEL_NAME is not defined in environment variables.");
  process.exit(1);
}

export const genAI = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
export const MODEL_NAME = process.env.MODEL_NAME;

// Cria um cliente Gemini com uma chave específica (para agentes com chave própria)
export function createGeminiClient(apiKey) {
  return new GoogleGenAI({ apiKey });
}

// Fábrica genérica — aceita apiKey opcional; se omitida usa o cliente padrão
export function createGeminiChat(config, history = [], apiKey = null) {
  const client = apiKey ? createGeminiClient(apiKey) : genAI;
  return client.chats.create({ model: MODEL_NAME, history, config });
}

export { FunctionCallingConfigMode };
