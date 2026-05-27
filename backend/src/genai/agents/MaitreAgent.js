import { BaseAgentAI } from '../models/index.js';
import { MAITRE_PROMPT } from '../config/index.js';

// Agente de Sala — gere clientes, mesas, reservas e pedidos de sala
class MaitreAgent extends BaseAgentAI {
  constructor() {
    super('Maitre', MAITRE_PROMPT, 0.1);
  }
}

export default MaitreAgent;
