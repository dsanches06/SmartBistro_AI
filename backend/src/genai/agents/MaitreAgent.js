import BaseAgentAI from '../models/BaseAgentAI.js';
import { MAITRE_PROMPT } from '../config/systemPrompt.js';

// Agente de Sala — gere clientes, mesas, reservas e pedidos de sala
class MaitreAgent extends BaseAgentAI {
  constructor() {
    super('Maitre', MAITRE_PROMPT, 0.1);
  }
}

export default MaitreAgent;
