import { BaseAgentAI } from "../models/index.js";
import { MAITRE_PROMPT } from "../config/index.js";

// Agente de Sala — gere clientes, mesas, reservas e pedidos de sala
// temp 0.4 → MEDIUM thinking (interação natural com o cliente, alguma criatividade)
class MaitreAgent extends BaseAgentAI {
  constructor() {
    super(
      "Maitre",
      MAITRE_PROMPT,
      0.4,
      null,
      [],
      true,
      process.env.GEMINI_API_KEY_MAITRE ?? null,
    );
  }
}

export default MaitreAgent;
