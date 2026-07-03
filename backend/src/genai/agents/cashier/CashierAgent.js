import { BaseAgentAI } from "../../models/index.js";
import { CASHIER_PROMPT } from "./cashierPrompt.js";

// Agente Cashier (Caixa) — gera a fatura e processa o pagamento do cliente.
// temp 0.3 → decisões financeiras determinísticas, sem criatividade.
class CashierAgent extends BaseAgentAI {
  constructor() {
    super("Cashier", CASHIER_PROMPT, 0.3, null);
  }
}

export default CashierAgent;
