import BaseAgentAI from '../models/BaseAgentAI.js';
import { MANAGER_PROMPT } from '../config/systemPrompt.js';

// Agente de Gestão — supervisiona operações, analytics, faturas e pagamentos
class ManagerAgent extends BaseAgentAI {
  constructor() {
    super('Manager', MANAGER_PROMPT, 0.1);
  }
}

export default ManagerAgent;
