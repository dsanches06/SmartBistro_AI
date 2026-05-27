import { BaseAgentAI } from '../models/index.js';
import { CHEF_PROMPT } from '../config/index.js';

// Agente de Cozinha — gere menu, receitas, ingredientes e stock
class ChefAgent extends BaseAgentAI {
  constructor() {
    super('Chef', CHEF_PROMPT, 0.1);
  }
}

export default ChefAgent;
