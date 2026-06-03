import { BaseAgentAI } from "../../models/index.js";
import { CHEF_PROMPT } from "../../config/index.js";

// Agente de Cozinha — gere menu, receitas, ingredientes e stock
// temp 0.2 → LOW reasoning_effort (decisões precisas: stock, receitas, disponibilidade)
class ChefAgent extends BaseAgentAI {
  constructor() {
    super("Chef", CHEF_PROMPT, 0.2, null, [], true);
  }
}

export default ChefAgent;
