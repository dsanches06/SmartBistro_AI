import {
  MaitreAgent,
  ChefAgent,
  ManagerAgent,
  MaitreResponseSchema,
  ChefResponseSchema,
  ManagerResponseSchema,
  attemptRepairMaitreResponse,
  enforceMenuPrices,
  deriveChefStockMetrics,
  repairManagerResponse,
  buildMaitreMessage,
  buildMaitreStockFeedbackMessage,
  buildChefMessage,
  buildManagerMessage,
} from "../agents/index.js";
import {
  calculateInvoiceTotals,
  calculateProfitMargin,
} from "../../utils/index.js";
import { getAllTables, getActiveItems } from "../../services/index.js";
import { PipelineError } from "../../utils/pipelineError.js";
import { validateAgentOutput, extractJSON } from "../helpers/index.js";

/**
 * Pipeline com dois caminhos consoante o tipo de serviço:
 *
 *   TABLE    → Fase 1 Maître (verifica mesas disponíveis e atribui uma)
 *              → Fase 2 Chef (sequência KDS + stock)
 *              → Fase 3 Manager (fatura)
 *
 *   TAKEAWAY → Salta o Maître (não há mesa para atribuir)
 *              → Fase 2 Chef directamente
 *              → Fase 3 Manager (fatura)
 *
 * Os totais financeiros são SEMPRE calculados por funções JS puras
 * ANTES de chegar ao ManagerAgent — o agente nunca faz aritmética.
 *
 * @param {object} orderData
 * @param {number} orderData.customer_id     - ID do cliente (obrigatório)
 * @param {string} orderData.message         - Pedido em linguagem natural
 * @param {string} [orderData.service_type]  - "Table" | "Takeaway" (default: "Table")
 * @param {number} [orderData.tax_rate]      - IVA (default da calculateInvoiceTotals)
 * @param {number} [orderData.discount]      - Desconto (ex: 0.10 = 10%)
 * @param {string} [orderData.discount_type] - "percent" | "fixed"
 * @returns {{ validated, sequenced, financials, final }}
 */
export async function runOrderPipeline(orderData) {
  const normalised = {
    ...orderData,
    taxRate: orderData.taxRate ?? orderData.tax_rate ?? undefined,
    discountType:
      orderData.discountType ?? orderData.discount_type ?? undefined,
  };

  const isTakeaway =
    (normalised.service_type ?? normalised.serviceType ?? "Table") === "Takeaway";

  let validated;

  if (isTakeaway) {
    // ── TAKEAWAY: salta o Maître — não há mesa a atribuir ──────────────────
    console.log("[Pipeline] Takeaway detectado — a carregar menu activo...");
    const menuItems = await getActiveItems();
    console.log(`[Pipeline] Menu: ${menuItems.length} item(ns) activos`);

    // Constrói o objecto "validated" directamente a partir dos dados recebidos
    // (equivalente ao que o Maître devolveria mas sem selecção de mesa)
    const rawItems = normalised.items ?? [];
    validated = {
      customer_name:        normalised.customer_name ?? null,
      customer_surname:     normalised.customer_surname ?? null,
      table_id:             null,
      service_type:         "Takeaway",
      allergy_restrictions: normalised.allergy_restrictions ?? null,
      validation_status:    "valid",
      items: rawItems.map((i) => {
        const menuItem = menuItems.find((m) => m.id === (i.item_id ?? i.id));
        return {
          item_id:         i.item_id ?? i.id,
          name:            menuItem?.name ?? i.name,
          quantity:        i.quantity ?? 1,
          price:           Number(menuItem?.price ?? i.price ?? 0),
          price_corrected: false,
        };
      }),
      notes: null,
    };
    console.log(
      `[Pipeline] Takeaway pronto — ${validated.items.length} item(s), a avançar para Chef...`,
    );

    // Passa o menuItems adiante para as fases seguintes
    return _runChefAndManager(validated, menuItems, normalised);
  }

  // ── TABLE: pipeline completo Maître → Chef → Manager ─────────────────────
  console.log("[Pipeline] Table detectado — a carregar mesas e menu activo...");
  const [availableTables, menuItems] = await Promise.all([
    getAllTables("Available"),
    getActiveItems(),
  ]);
  console.log(
    `[Pipeline] Contexto: ${availableTables.length} mesa(s) disponível(eis), ${menuItems.length} item(ns) no menu`,
  );

  console.log(
    "[Pipeline] Fase 1 — Maître a verificar mesa disponível e interpretar pedido...",
  );
  const maitre = new MaitreAgent();
  const validatedText = await maitre.sendMessage(
    buildMaitreMessage(normalised, availableTables, menuItems),
  );
  validated = extractJSON(validatedText, "Maître");
  validated = attemptRepairMaitreResponse(validated, menuItems, validatedText);
  validated = validateAgentOutput(MaitreResponseSchema, validated, "Maître");
  validated = enforceMenuPrices(validated, menuItems);

  if (String(validated.validation_status).toLowerCase() === "invalid") {
    const invalidList = Array.isArray(validated.invalid_items)
      ? validated.invalid_items.map((i) => i.name || i.item_id).join(", ")
      : "unknown";
    console.log(
      `[Pipeline] Maître devolveu validation_status=invalid — itens: ${invalidList}`,
    );
    throw new PipelineError(
      `[MaîtreValidation] Itens inválidos: ${invalidList}`,
      {
        code: "MAITRE_INVALID_ITEMS",
        stage: "maitre_validation",
        details: { invalid_items: validated.invalid_items ?? [] },
      },
    );
  }

  console.log(
    `[Pipeline] Maître concluído — mesa: T${validated.table_id ?? "(sem mesa)"}, ${validated.items?.length ?? 0} item(s)`,
  );

  return _runChefAndManager(validated, menuItems, normalised, maitre, availableTables);
}

/**
 * Fases 2 (Chef) e 3 (Manager) — partilhadas entre Table e Takeaway.
 * Para Takeaway, maitre=null e availableTables=[] (retry de stock não se aplica).
 */
async function _runChefAndManager(validated, menuItems, normalised, maitre = null, availableTables = []) {

  console.log("[Pipeline] Fase 2 — Chefe a verificar stock e sequência...");
  const chef = new ChefAgent();
  const sequencedText = await chef.sendMessage(
    buildChefMessage(validated, menuItems),
  );
  let sequenced = extractJSON(sequencedText, "Chefe");
  sequenced = validateAgentOutput(ChefResponseSchema, sequenced, "Chefe");

  const { unavailableItems, stockStatus, stockAlerts } = deriveChefStockMetrics(sequenced);

  if (
    stockStatus !== "ok" ||
    stockAlerts.length > 0 ||
    unavailableItems.length > 0
  ) {
    console.log(
      `[Pipeline] Chefe reportou stock_status=${stockStatus}, stock_alerts=${stockAlerts.length}, unavailable_items=${unavailableItems.length}`,
    );
  }

  // Retry com Maître só existe no fluxo Table (maitre disponível)
  if (unavailableItems.length > 0 && maitre) {
    console.log(
      `[Pipeline] Chefe identificou ${unavailableItems.length} item(s) indisponíveis. A enviar feedback ao Maître...`,
    );
    const retryText = await maitre.sendMessage(
      buildMaitreStockFeedbackMessage(
        validated,
        availableTables,
        menuItems,
        sequenced,
      ),
    );
    let retryValidated = extractJSON(retryText, "MaîtreRetry");
    retryValidated = validateAgentOutput(
      MaitreResponseSchema,
      retryValidated,
      "MaîtreRetry",
    );
    retryValidated = enforceMenuPrices(retryValidated, menuItems);

    if (
      JSON.stringify(retryValidated.items) === JSON.stringify(validated.items)
    ) {
      throw new PipelineError(
        "[MaîtreRetry] O pedido não foi ajustado após alerta de stock.",
        {
          code: "MAITRE_RETRY_UNCHANGED",
          stage: "maitre_retry",
        },
      );
    }

    validated = retryValidated;
    const retrySequencedText = await chef.sendMessage(
      buildChefMessage(validated, menuItems),
    );
    sequenced = extractJSON(retrySequencedText, "ChefeRetry");
    sequenced = validateAgentOutput(
      ChefResponseSchema,
      sequenced,
      "ChefeRetry",
    );

    const retryUnavailableItems = Array.isArray(sequenced.items)
      ? sequenced.items.filter((item) => item?.unavailable === true)
      : [];

    console.log(
      `[Pipeline] ChefeRetry final — stock_status=${sequenced.stock_status ?? sequenced.stockStatus}, ` +
        `stock_alerts=${Array.isArray(sequenced.stock_alerts) ? sequenced.stock_alerts.length : Array.isArray(sequenced.stockAlerts) ? sequenced.stockAlerts.length : 0}, ` +
        `unavailable_items=${retryUnavailableItems.length}`,
    );

    if (retryUnavailableItems.length > 0) {
      throw new PipelineError(
        "[ChefeRetry] Ainda há itens indisponíveis no pedido ajustado.",
        {
          code: "CHEF_RETRY_STILL_UNAVAILABLE",
          stage: "chef_retry",
          details: { unavailable_items: retryUnavailableItems },
        },
      );
    }
  } else if (unavailableItems.length > 0) {
    // Takeaway sem Maître — reporta os indisponíveis directamente
    throw new PipelineError(
      `[Chef] Itens indisponíveis no pedido Takeaway: ${unavailableItems.map(i => i.name).join(", ")}`,
      {
        code: "CHEF_UNAVAILABLE_ITEMS",
        stage: "chef",
        details: { unavailable_items: unavailableItems },
      },
    );
  }

  console.log(
    `[Pipeline] Chefe concluído — sequência: ${(sequenced.kitchen_sequence ?? []).join(" → ")}`,
  );

  const items = sequenced.items ?? validated.items ?? normalised.items ?? [];
  const financials = calculateInvoiceTotals({
    items,
    taxRate: sequenced.taxRate ?? normalised.taxRate,
    discount: sequenced.discount ?? normalised.discount,
    discountType: sequenced.discountType ?? normalised.discountType,
  });
  financials.profitMargin = calculateProfitMargin(
    financials.total,
    sequenced.ingredientsCost ?? 0,
  );
  console.log(
    `[Pipeline] Financeiro calculado em JS — total: €${financials.total}`,
  );

  console.log("[Pipeline] Fase 3 — Gerente a formatar fatura...");
  const manager = new ManagerAgent();
  const finalText = await manager.sendMessage(
    buildManagerMessage(validated, sequenced, financials),
  );
  const finalRaw = extractJSON(finalText, "Gerente");
  const finalRepaired = repairManagerResponse(finalRaw, financials);
  const final = validateAgentOutput(
    ManagerResponseSchema,
    finalRepaired,
    "Gerente",
  );
  console.log("[Pipeline] Gerente concluído.");

  return { validated, sequenced, financials, final };
}

export {
  attemptRepairMaitreResponse,
  enforceMenuPrices,
  repairManagerResponse,
  extractJSON,
};
