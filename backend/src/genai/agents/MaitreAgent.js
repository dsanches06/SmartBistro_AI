import BaseAgentAI from '../models/BaseAgentAI.js';
import { MAITRE_PROMPT } from '../config/systemPrompt.js';

// Agente Contabilista — processa e categoriza transações financeiras
class MaitreAgent extends BaseAgentAI {
  constructor() {
    super('Maitre', MAITRE_PROMPT, 0.1);
  }
}

export default MaitreAgent;
