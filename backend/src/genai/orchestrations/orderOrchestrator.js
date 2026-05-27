import { MaitreAgent, ChefAgent, ManagerAgent } from '../agents/index.js';

// Extrai JSON de uma resposta do agente (remove blocos markdown se existirem)
function extractJSON(text) {
  const match = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  const raw = match ? match[1] : text;
  return JSON.parse(raw.trim());
}

/**
 * Pipeline sequencial dos 3 agentes:
 * Maître (validação) → Chefe (cozinha) → Gerente (financeiro)
 *
 * @param {object} orderData - Dados do pedido a processar
 * @returns {{ validated, sequenced, final }} — Resultados de cada agente
 */
export async function runOrderPipeline(orderData) {
  // Fase 1 — Maître: valida e enriquece os dados do pedido
  const maitre = new MaitreAgent();
  const validatedText = await maitre.sendMessage(
    `Valida e enriquece os dados deste pedido. Confirma cliente, mesa e itens do menu:\n${JSON.stringify(orderData, null, 2)}`
  );
  const validated = extractJSON(validatedText);

  // Fase 2 — Chefe: verifica stock e define sequência de preparação
  const chef = new ChefAgent();
  const sequencedText = await chef.sendMessage(
    `Verifica o stock dos ingredientes e cria a sequência de preparação para este pedido:\n${JSON.stringify(validated, null, 2)}`
  );
  const sequenced = extractJSON(sequencedText);

  // Fase 3 — Gerente: calcula totais e gera fatura
  const manager = new ManagerAgent();
  const finalText = await manager.sendMessage(
    `Calcula os totais financeiros (subtotal, IVA 23%, total) e prepara a fatura para este pedido:\n${JSON.stringify(sequenced, null, 2)}`
  );
  const final = extractJSON(finalText);

  return { validated, sequenced, final };
}
