import { MaitreAgent, ChefAgent, ManagerAgent } from "../agents/index.js";
import {
  calculateInvoiceTotals,
  calculateProfitMargin,
} from "../../utils/index.js";

// ── Extrai JSON de resposta do agente — 3 estratégias ─────────────────────────
// Os agentes podem devolver:
//   a) bloco markdown: ```json { ... } ```
//   b) JSON puro:      { ... }
//   c) Texto misto:    "Aqui está o resultado: { ... }"
function extractJSON(text, agentName = "agent") {
  if (!text) throw new Error(`[${agentName}] Resposta vazia.`);

  // 1. Bloco markdown ```json ... ``` ou ``` ... ```
  const block = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (block) {
    try { return JSON.parse(block[1].trim()); } catch {}
  }

  // 2. JSON puro (resposta começa com { ou [)
  const trimmed = text.trim();
  if (trimmed.startsWith("{") || trimmed.startsWith("[")) {
    try { return JSON.parse(trimmed); } catch {}
  }

  // 3. Primeiro objeto JSON encontrado no texto
  const match = text.match(/\{[\s\S]*\}/);
  if (match) {
    try { return JSON.parse(match[0]); } catch {}
  }

  throw new Error(
    `[${agentName}] Não foi possível extrair JSON da resposta.\nResposta (primeiros 300 chars): ${text.substring(0, 300)}`,
  );
}

// ── Mensagens estruturadas para cada agente ────────────────────────────────────

function buildMaitreMessage(orderData) {
  return `
Analisa o seguinte pedido de restaurante e devolve APENAS JSON (sem texto adicional, sem markdown).

TAREFA:
1. Confirma se o cliente (customer_id ${orderData.customer_id}) é válido
2. Confirma se a mesa (table_id ${orderData.table_id ?? "null — Takeaway"}) está disponível
3. Valida os itens do menu solicitados
4. Regista restrições alimentares: ${orderData.allergy_restrictions ?? "nenhuma"}
5. Organiza a fila inicial de pedidos (itens por ordem de chegada)

RESPONDE EXACTAMENTE com este JSON (sem comentários, sem markdown):
{
  "customer_id": <número>,
  "table_id": <número ou null>,
  "service_type": "<Dine-In ou Takeaway>",
  "allergy_restrictions": <"string" ou null>,
  "validation_status": "valid",
  "items": [
    { "item_id": <número>, "name": "<nome>", "quantity": <número>, "price": <preço> }
  ],
  "notes": "<observações do Maître>"
}

DADOS DO PEDIDO:
${JSON.stringify(orderData, null, 2)}
`.trim();
}

function buildChefMessage(validated) {
  return `
Recebeste do Maître a fila de pedidos validada. Devolve APENAS JSON (sem texto, sem markdown).

TAREFA:
1. Define a sequência de preparação óptima por secção da cozinha (grelhados, massas, entradas, etc.)
2. Verifica o stock de ingredientes para cada prato
3. Estima o tempo total de preparação em minutos
4. Se algum ingrediente estiver em falta, indica na lista stock_alerts

RESPONDE EXACTAMENTE com este JSON:
{
  "kitchen_sequence": ["<prato 1>", "<prato 2>"],
  "sections": { "<secção>": ["<prato>"] },
  "stock_status": "ok" | "partial" | "insufficient",
  "stock_alerts": [],
  "estimated_minutes": <número>,
  "items": [
    { "item_id": <número>, "name": "<nome>", "quantity": <número>, "price": <preço> }
  ],
  "notes": "<observações do Chefe>"
}

FILA DE PEDIDOS DO MAÎTRE:
${JSON.stringify(validated, null, 2)}
`.trim();
}

function buildManagerMessage(sequenced, financials) {
  return `
Recebeste do Chefe a sequência de preparação. Os totais financeiros já estão calculados em JS — NÃO RECALCULES.
Devolve APENAS JSON (sem texto, sem markdown).

TAREFA:
1. Confirma a fatura com os totais calculados abaixo
2. Define o estado inicial do pagamento como "Pending"
3. Gera o objeto final do pedido completamente estruturado

TOTAIS JÁ CALCULADOS (não alterar):
  subtotal : €${financials.subtotal}
  IVA (${(financials.taxRate * 100).toFixed(0)}%)  : €${financials.taxAmount}
  total    : €${financials.total}

RESPONDE EXACTAMENTE com este JSON:
{
  "success": true,
  "order_summary": "<resumo do pedido>",
  "invoice": {
    "subtotal_amount": ${financials.subtotal},
    "tax_rate": ${financials.taxRate},
    "tax_amount": ${financials.taxAmount},
    "total_amount": ${financials.total}
  },
  "payment": {
    "method": "Pending",
    "status": "Pending"
  },
  "notes": "<observações do Gerente>"
}

DADOS DA SEQUÊNCIA (Chefe):
${JSON.stringify(sequenced, null, 2)}
`.trim();
}

/**
 * Pipeline sequencial dos 3 agentes:
 *   Maître  → valida cliente, mesa e itens; organiza fila de pedidos
 *   Chefe   → sequência de preparação por secção + desconto de stock
 *   Gerente → confirma fatura (totais pré-calculados em JS) + objeto final
 *
 * Os totais financeiros são SEMPRE calculados por funções JS puras
 * ANTES de chegar ao ManagerAgent — o agente nunca faz aritmética.
 *
 * @param {object} orderData - Dados do pedido (formulário)
 * @returns {{ validated, sequenced, financials, final }}
 */
export async function runOrderPipeline(orderData) {
  // Normaliza campos que podem vir em snake_case do formulário HTTP
  const normalised = {
    ...orderData,
    taxRate:      orderData.taxRate      ?? orderData.tax_rate      ?? undefined,
    discountType: orderData.discountType ?? orderData.discount_type ?? undefined,
  };

  // ── Fase 1 — Maître ───────────────────────────────────────────────────────────
  console.log("[Pipeline] Fase 1 — Maître a validar pedido...");
  const maitre = new MaitreAgent();
  const validatedText = await maitre.sendMessage(buildMaitreMessage(normalised));
  const validated = extractJSON(validatedText, "Maître");
  console.log(`[Pipeline] Maître concluído — ${validated.items?.length ?? 0} item(s) validado(s)`);

  // ── Fase 2 — Chefe ────────────────────────────────────────────────────────────
  console.log("[Pipeline] Fase 2 — Chefe a verificar stock e sequência...");
  const chef = new ChefAgent();
  const sequencedText = await chef.sendMessage(buildChefMessage(validated));
  const sequenced = extractJSON(sequencedText, "Chefe");
  console.log(`[Pipeline] Chefe concluído — sequência: ${(sequenced.kitchen_sequence ?? []).join(" → ")}`);

  // ── Cálculo financeiro em JS puro (nunca pelo modelo) ─────────────────────────
  const items = sequenced.items ?? validated.items ?? normalised.items ?? [];
  const financials = calculateInvoiceTotals({
    items,
    taxRate:      sequenced.taxRate      ?? normalised.taxRate,
    discount:     sequenced.discount     ?? normalised.discount,
    discountType: sequenced.discountType ?? normalised.discountType,
  });
  financials.profitMargin = calculateProfitMargin(
    financials.total,
    sequenced.ingredientsCost ?? 0,
  );
  console.log(`[Pipeline] Financeiro calculado em JS — total: €${financials.total}`);

  // ── Fase 3 — Gerente ──────────────────────────────────────────────────────────
  console.log("[Pipeline] Fase 3 — Gerente a formatar fatura...");
  const manager = new ManagerAgent();
  const finalText = await manager.sendMessage(buildManagerMessage(sequenced, financials));
  const final = extractJSON(finalText, "Gerente");
  console.log("[Pipeline] Gerente concluído.");

  return { validated, sequenced, financials, final };
}
