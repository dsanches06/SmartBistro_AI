import { BaseAgentAI } from "../models/index.js";
import { MANAGER_PROMPT } from "../config/index.js";

// Agente de Gestão — supervisiona operações, analytics, faturas e pagamentos
// temp 0.3 → LOW thinking (cálculos financeiros, lógica determinística)
class ManagerAgent extends BaseAgentAI {
  constructor() {
    super(
      "Manager",
      MANAGER_PROMPT,
      0.3,
      null,
      [],
      true,
      process.env.GEMINI_API_KEY_MANAGER ?? null,
    );
  }
}

export default ManagerAgent;
