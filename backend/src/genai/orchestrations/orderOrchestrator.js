import { MaitreAgent, ChefAgent, ManagerAgent } from "../agents/index.js";
import {
  calculateInvoiceTotals,
  calculateProfitMargin,
} from "../../utils/index.js";

// Extrai JSON de uma resposta do agente (remove blocos markdown se existirem)
function extractJSON(text) {
  const match = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  const raw = match ? match[1] : text;
  return JSON.parse(raw.trim());
}

/**
 * Pipeline sequencial dos 3 agentes:
 *   Maître  → valida cliente, mesa e itens
 *   Chefe   → verifica stock e sequência de preparação
 *   Gerente → cria fatura e regista pagamento (totais calculados em JS)
 *
 * Os totais financeiros são SEMPRE calculados por funções JS puras antes de
 * chegar ao ManagerAgent — o agente nunca faz aritmética.
 *
 * @param {object} orderData - Dados do pedido a processar
 * @returns {{ validated, sequenced, financials, final }}
 */
export async function runOrderPipeline(orderData) {
  // ── Fase 1 — Maître: valida e enriquece os dados do pedido ──────────────────
  const maitre = new MaitreAgent();
  const validatedText = await maitre.sendMessage(
    `Valida e enriquece os dados deste pedido. Confirma cliente, mesa e itens do menu:\n${JSON.stringify(orderData, null, 2)}`,
  );
  const validated = extractJSON(validatedText);

  // ── Fase 2 — Chefe: verifica stock e define sequência de preparação ──────────
  const chef = new ChefAgent();
  const sequencedText = await chef.sendMessage(
    `Verifica o stock dos ingredientes e cria a sequência de preparação para este pedido:\n${JSON.stringify(validated, null, 2)}`,
  );
  const sequenced = extractJSON(sequencedText);

  // ── Cálculo financeiro em JS (funções puras — sem IA) ────────────────────────
  const items = sequenced.items ?? validated.items ?? orderData.items ?? [];
  const financials = calculateInvoiceTotals({
    items,
    taxRate: sequenced.taxRate ?? orderData.taxRate, // default: 0.13
    discount: sequenced.discount ?? orderData.discount, // default: 0
    discountType: sequenced.discountType ?? orderData.discountType,
  });
  financials.profitMargin = calculateProfitMargin(
    financials.total,
    sequenced.ingredientsCost ?? 0,
  );

  // ── Fase 3 — Gerente: cria fatura e regista pagamento ───────────────────────
  // Os totais chegam já calculados — o agente só orquestra as operações na BD
  const manager = new ManagerAgent();
  const finalText = await manager.sendMessage(
    `Os totais financeiros já estão calculados (não recalcules).
Cria a fatura e regista o pagamento com os seguintes valores:

${JSON.stringify({ ...sequenced, financials }, null, 2)}`,
  );
  const final = extractJSON(finalText);

  return { validated, sequenced, financials, final };
}
