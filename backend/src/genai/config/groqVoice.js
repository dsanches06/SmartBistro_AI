import path from "path";
import { fileURLToPath } from "url";
import Groq from "groq-sdk";
import dotenv from "dotenv";

// Cliente Groq dedicado à transcrição de voz (Whisper) — a Claude API não tem
// equivalente, por isso este é o único ponto do projecto que ainda usa Groq.
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, "../../../.env.local") });
dotenv.config({ path: path.resolve(__dirname, "../../../.env") });

if (!process.env.GROQ_API_KEY) {
  console.error("GROQ_API_KEY is not defined in environment variables (necessário para transcrição de voz).");
  process.exit(1);
}

export const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
