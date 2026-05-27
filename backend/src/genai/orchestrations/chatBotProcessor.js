import { BaseChatProcessor } from "../models/index.js";
import { classifyGeminiError } from "../../utils/index.js";

// ── Declarações das ferramentas ────────────────────────────────────────────────
import {
  createCustomerFunctionDeclaration,
  getCustomerFunctionDeclaration,
} from "../functions/customers/index.js";
import {
  getTableFunctionDeclaration,
  updateTableStatusFunctionDeclaration,
} from "../functions/tables/index.js";
import { getItemFunctionDeclaration } from "../functions/items/index.js";
import { getRecipeItemsFunctionDeclaration } from "../functions/recipe_items/index.js";
import {
  getStockFunctionDeclaration,
  adjustStockFunctionDeclaration,
} from "../functions/stock/index.js";
import {
  createOrderFunctionDeclaration,
  updateOrderStatusFunctionDeclaration,
} from "../functions/orders/index.js";
import { createOrderItemFunctionDeclaration } from "../functions/order_items/index.js";
import { createInvoiceFunctionDeclaration } from "../functions/invoices/index.js";
import {
  createPaymentFunctionDeclaration,
  updatePaymentStatusFunctionDeclaration,
} from "../functions/payments/index.js";
import { createNotificationFunctionDeclaration } from "../functions/notifications/index.js";
import { createLogFunctionDeclaration } from "../functions/logs/index.js";

// ── Services (operações reais na BD) ──────────────────────────────────────────
import {
  getCustomerById,
  getAllCustomers,
  createCustomer,
  getTableById,
  getAllTables,
  updateTableStatus,
  getItemById,
  getRecipeByItemId,
  getStockByIngredientId,
  adjustQuantity,
  createOrder,
  updateOrderStatus,
  createOrderItem,
  createInvoice,
  createPayment,
  updatePayment,
  createNotification,
  createLog,
} from "../../services/index.js";

// ── Todas as declarações de ferramentas do pipeline ───────────────────────────
const ALL_DECLARATIONS = [
  createCustomerFunctionDeclaration,
  getCustomerFunctionDeclaration,
  getTableFunctionDeclaration,
  updateTableStatusFunctionDeclaration,
  getItemFunctionDeclaration,
  getRecipeItemsFunctionDeclaration,
  getStockFunctionDeclaration,
  adjustStockFunctionDeclaration,
  createOrderFunctionDeclaration,
  updateOrderStatusFunctionDeclaration,
  createOrderItemFunctionDeclaration,
  createInvoiceFunctionDeclaration,
  createPaymentFunctionDeclaration,
  updatePaymentStatusFunctionDeclaration,
  createNotificationFunctionDeclaration,
  createLogFunctionDeclaration,
];

// ── Handlers: recebem os args do Gemini e executam operações na BD ─────────────
const FUNCTION_HANDLERS = {
  get_customer: async (args) => {
    if (args.customer_id) return getCustomerById(args.customer_id);
    if (args.email || args.phone) {
      const term = args.email || args.phone;
      const list = await getAllCustomers(term);
      return list[0] ?? null;
    }
    return null;
  },
  create_customer: async (args) => createCustomer(args),
  get_table: async (args) => {
    if (args.table_id) return getTableById(args.table_id);
    if (args.table_number) {
      const tables = await getAllTables();
      return tables.find((t) => t.table_number === args.table_number) ?? null;
    }
    return null;
  },
  update_table_status: async (args) =>
    updateTableStatus(args.table_id, args.status),
  get_item: async (args) => getItemById(args.item_id),
  get_recipe_items: async (args) => getRecipeByItemId(args.item_id),
  get_stock: async (args) => getStockByIngredientId(args.ingredient_id),
  adjust_stock: async (args) => adjustQuantity(args.ingredient_id, args.delta),
  create_order: async (args) => createOrder(args),
  update_order_status: async (args) =>
    updateOrderStatus(args.order_id, args.order_status),
  create_order_item: async (args) => createOrderItem(args),
  create_invoice: async (args) => createInvoice(args),
  create_payment: async (args) => createPayment(args),
  update_payment_status: async (args) =>
    updatePayment(args.payment_id, {
      payment_status: args.payment_status,
      ...(args.payment_method && { payment_method: args.payment_method }),
      processed_at: args.processed_at,
    }),
  create_notification: async (args) => createNotification(args),
  create_log: async (args) => createLog(args),
};

// ── SmartBistroChatProcessor ───────────────────────────────────────────────────
class SmartBistroChatProcessor extends BaseChatProcessor {
  constructor() {
    super({
      toolConfig: ALL_DECLARATIONS,
      functionHandlers: FUNCTION_HANDLERS,
    });
    this.history = [];
  }

  async chat(message, onChunk) {
    const result = await this.processChatMessageStream(
      message,
      this.history,
      onChunk,
    );
    this.history.push({ role: "user", content: message });
    this.history.push({ role: "assistant", content: result.message || "" });
    return result;
  }
}

// ── Sessões por conversationId ────────────────────────────────────────────────
const sessions = new Map();

function getOrCreateSession(conversationId) {
  if (!sessions.has(conversationId)) {
    sessions.set(conversationId, new SmartBistroChatProcessor());
  }
  return sessions.get(conversationId);
}

/**
 * Processa uma mensagem com streaming SSE e function calling.
 * Interface compatível com chatBotController.js.
 */
export async function processChatStream(
  message,
  conversationId,
  { onChunk, onDone, onError },
) {
  const processor = getOrCreateSession(String(conversationId));
  try {
    const result = await processor.chat(message, onChunk);
    if (onDone) onDone(result.message || "");
  } catch (err) {
    // Classifica o erro bruto do Gemini numa estrutura tipada e com mensagem
    // amigável antes de propagar para o controller via onError
    const classified = classifyGeminiError(err);
    const enriched = new Error(classified.userMessage);
    enriched.geminiType = classified.type;
    enriched.originalError = err;

    if (onError) onError(enriched);
    else throw enriched;
  }
}

// Remove a sessão da memória (usar quando a conversa é eliminada)
export function clearSession(conversationId) {
  sessions.delete(String(conversationId));
}
