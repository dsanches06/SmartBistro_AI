import BaseAgentAI from '../models/BaseAgentAI.js';
import { CHEF_PROMPT } from '../config/systemPrompt.js';

// Agente Contabilista — processa e categoriza transações financeiras
class ChefAgent extends BaseAgentAI {
  constructor() {
    super('Chef', CHEF_PROMPT, 0.1);
  }
}

export default ChefAgent;
