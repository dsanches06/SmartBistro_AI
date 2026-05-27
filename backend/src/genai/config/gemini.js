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

// Fábrica genérica — cada caller fornece o seu próprio config
export function createGeminiChat(config, history = []) {
  return genAI.chats.create({ model: MODEL_NAME, history, config });
}

export { FunctionCallingConfigMode };
