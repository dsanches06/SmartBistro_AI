import { BaseAgentAI } from "../models/index.js";
import { CHEF_PROMPT } from "../config/index.js";

// Agente de Cozinha — gere menu, receitas, ingredientes e stock
// temp 0.2 → LOW thinking (decisões precisas: stock, receitas, disponibilidade)
class ChefAgent extends BaseAgentAI {
  constructor() {
    super(
      "Chef",
      CHEF_PROMPT,
      0.2,
      null,
      [],
      true,
      process.env.GEMINI_API_KEY_CHEF ?? null,
    );
  }
}

export default ChefAgent;
