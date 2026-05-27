import BaseAgentAI from '../models/BaseAgentAI.js';
import { MANAGER_PROMPT } from '../config/systemPrompt.js';

// Agente Contabilista — processa e categoriza transações financeiras
class ManagerAgent extends BaseAgentAI {
  constructor() {
    super('Manager', MANAGER_PROMPT, 0.1);
  }
}

export default ManagerAgent;
