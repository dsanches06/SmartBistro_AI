import { MaitreAgent, ChefAgent, ManagerAgent } from "../agents/index.js";
import {
  calculateInvoiceTotals,
  calculateProfitMargin,
} from "../../utils/index.js";
import { getAllTables, getActiveItems } from "../../services/index.js";

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

function buildMaitreMessage(orderData, availableTables, menuItems) {
  const tablesInfo = availableTables.length
    ? availableTables
        .map((t) => `  - id ${t.id}, ${t.table_number}, capacidade ${t.capacity}, ${t.status}`)
        .join("\n")
    : "  (nenhuma mesa disponível de momento)";

  const menuInfo = menuItems
    .map((i) => `  - id ${i.id}, ${i.name}, ${i.category ?? "—"}, €${Number(i.price).toFixed(2)}`)
    .join("\n");

  return `
Analisa a mensagem do cliente e devolve APENAS JSON (sem texto adicional, sem markdown).

MENSAGEM DO CLIENTE:
"${orderData.message}"

CUSTOMER_ID: ${orderData.customer_id}

MESAS DISPONÍVEIS (status Available):
${tablesInfo}

MENU ACTIVO:
${menuInfo}

TAREFA:
1. Detecta o tipo de serviço: "Dine-In" (jantar/almoço/comer aqui) ou "Takeaway" (levar/para fora/takeaway)
2. Se Dine-In: escolhe UMA mesa disponível adequada ao número de pessoas mencionado (mínimo 1)
3. Identifica os pratos pedidos fazendo corresponder ao menu activo por semelhança fonética/textual
4. Estima a quantidade de cada prato (1 por padrão, salvo indicação contrária)
5. Usa os preços exactos do menu activo fornecido acima
6. Regista restrições alimentares ou alergias mencionadas (null se nenhuma)

RESPONDE EXACTAMENTE com este JSON (sem comentários, sem markdown):
{
  "customer_id": <número>,
  "table_id": <número ou null se Takeaway>,
  "service_type": "Dine-In" | "Takeaway",
  "allergy_restrictions": <"string" ou null>,
  "validation_status": "valid",
  "items": [
    { "item_id": <número>, "name": "<nome exacto do menu>", "quantity": <número>, "price": <preço decimal> }
  ],
  "notes": "<observações do Maître — ex: mesa T03 atribuída para 2 pessoas>"
}
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
 *   Maître  → interpreta a mensagem em linguagem natural, selecciona mesa
 *             (Dine-In) a partir das mesas Available em BD, e mapeia os
 *             itens pedidos ao menu activo devolvendo JSON estruturado
 *   Chefe   → sequência de preparação por secção + desconto de stock
 *   Gerente → confirma fatura (totais pré-calculados em JS) + objeto final
 *
 * Os totais financeiros são SEMPRE calculados por funções JS puras
 * ANTES de chegar ao ManagerAgent — o agente nunca faz aritmética.
 *
 * @param {object} orderData
 * @param {number} orderData.customer_id  - ID do cliente (obrigatório)
 * @param {string} orderData.message      - Pedido em linguagem natural (obrigatório)
 * @param {number} [orderData.tax_rate]   - IVA (default da calculateInvoiceTotals)
 * @param {number} [orderData.discount]   - Desconto (ex: 0.10 = 10%)
 * @param {string} [orderData.discount_type] - "percent" | "fixed"
 * @returns {{ validated, sequenced, financials, final }}
 */
export async function runOrderPipeline(orderData) {
  // Normaliza campos que podem vir em snake_case do formulário HTTP
  const normalised = {
    ...orderData,
    taxRate:      orderData.taxRate      ?? orderData.tax_rate      ?? undefined,
    discountType: orderData.discountType ?? orderData.discount_type ?? undefined,
  };

  // ── Pré-carrega contexto para o Maître (em paralelo) ──────────────────────────
  console.log("[Pipeline] A carregar mesas disponíveis e menu activo...");
  const [availableTables, menuItems] = await Promise.all([
    getAllTables("Available"),
    getActiveItems(),
  ]);
  console.log(`[Pipeline] Contexto: ${availableTables.length} mesa(s) disponível(eis), ${menuItems.length} item(ns) no menu`);

  // ── Fase 1 — Maître ───────────────────────────────────────────────────────────
  console.log("[Pipeline] Fase 1 — Maître a interpretar pedido em linguagem natural...");
  const maitre = new MaitreAgent();
  const validatedText = await maitre.sendMessage(buildMaitreMessage(normalised, availableTables, menuItems));
  const validated = extractJSON(validatedText, "Maître");
  console.log(`[Pipeline] Maître concluído — mesa: ${validated.table_id ?? "Takeaway"}, ${validated.items?.length ?? 0} item(s)`);

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
