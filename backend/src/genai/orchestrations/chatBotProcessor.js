import { BaseChatProcessor } from "../models/index.js";
import { CHATBOT_SYSTEM_PROMPT } from "../config/index.js";
import { classifyGroqError, calculateInvoiceTotals, calculateProfitMargin } from "../../utils/index.js";
import { PipelineError } from "../../utils/pipelineError.js";

// ── Declarações das ferramentas ────────────────────────────────────────────────
import {
  createUserFunctionDeclaration,
  getUserFunctionDeclaration,
  findOrCreateUserFunctionDeclaration,
} from "../functions/users/index.js";
import {
  getTableFunctionDeclaration,
  updateTableStatusFunctionDeclaration,
} from "../functions/tables/index.js";
import {
  getItemFunctionDeclaration,
  getItemsFunctionDeclaration,
} from "../functions/items/index.js";
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
import {
  createInvoiceFunctionDeclaration,
  calculateInvoiceTotalsFunctionDeclaration,
} from "../functions/invoices/index.js";
import {
  createPaymentFunctionDeclaration,
  updatePaymentStatusFunctionDeclaration,
} from "../functions/payments/index.js";
import { createNotificationFunctionDeclaration } from "../functions/notifications/index.js";
import { createLogFunctionDeclaration } from "../functions/logs/index.js";
import {
  getReservationFunctionDeclaration,
  createReservationFunctionDeclaration,
  cancelReservationFunctionDeclaration,
} from "../functions/reservations/index.js";

// ── Services (operações reais na BD) ──────────────────────────────────────────
import { getChatHistoryByConversationId } from "../../services/index.js";
import {
  getUserById,
  getAllUsers,
  createUser,
  findOrCreateUser,
  getTableById,
  getAllTables,
  updateTableStatus,
  getItemById,
  getAllItems,
  getItemsByOrderId,
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
  getReservationById,
  getActiveReservationByCustomerId, // alias do reservationService (recebe userId)
  getReservationsByTableId,
  createReservation,
  cancelReservation,
} from "../../services/index.js";

// ── Todas as declarações de ferramentas do pipeline ───────────────────────────
const ALL_DECLARATIONS = [
  findOrCreateUserFunctionDeclaration,
  getUserFunctionDeclaration,
  getTableFunctionDeclaration,
  updateTableStatusFunctionDeclaration,
  getItemFunctionDeclaration,
  getItemsFunctionDeclaration,
  getRecipeItemsFunctionDeclaration,
  getStockFunctionDeclaration,
  adjustStockFunctionDeclaration,
  createOrderFunctionDeclaration,
  updateOrderStatusFunctionDeclaration,
  createOrderItemFunctionDeclaration,
  calculateInvoiceTotalsFunctionDeclaration,
  createInvoiceFunctionDeclaration,
  createPaymentFunctionDeclaration,
  updatePaymentStatusFunctionDeclaration,
  createNotificationFunctionDeclaration,
  createLogFunctionDeclaration,
  getReservationFunctionDeclaration,
  createReservationFunctionDeclaration,
  cancelReservationFunctionDeclaration,
];

// ── Handlers: recebem os args do Groq e executam operações na BD ──────────────
export const FUNCTION_HANDLERS = {
  find_or_create_user: async (args) => {
    // Alguns modelos passam name como objecto em vez de string — coagir defensivamente
    let name = args.name;
    if (typeof name === 'object' && name !== null) {
      name = name.name ?? name.full_name ?? name.value ?? Object.values(name).filter(Boolean).join(' ');
    }
    return findOrCreateUser(String(name ?? '').trim(), args.phone ?? null);
  },

  get_user: async (args) => {
    if (args.user_id) return getUserById(args.user_id);
    const term = args.name || args.phone;
    if (term) {
      const list = await getAllUsers(term);
      return list[0] ?? null;
    }
    return null;
  },
  create_user: async (args) => createUser(args),
  get_table: async (args) => {
    if (args.table_id) return getTableById(args.table_id);
    const tables = await getAllTables();
    if (args.table_number) {
      const num = String(args.table_number).replace(/^[Tt]/, '');
      return tables.find((t) => String(t.table_number).replace(/^[Tt]/, '') === num) ?? null;
    }
    // Filtra por status — por defeito só devolve mesas Available (segurança contra modelo sem argumento)
    const statusFilter = args.status || 'Available';
    let filtered = tables.filter(t => t.status === statusFilter);
    if (args.min_capacity) filtered = filtered.filter(t => t.capacity >= Number(args.min_capacity));
    // Ordena por capacidade crescente para atribuir a mesa mais adequada
    filtered.sort((a, b) => a.capacity - b.capacity);
    return filtered[0] ?? null;
  },
  update_table_status: async (args) =>
    updateTableStatus(args.table_id, args.status),
  get_item: async (args) => getItemById(args.item_id),
  get_items: async (args) => {
    const category = args.category ? String(args.category).trim() : undefined;
    const search = args.search ? String(args.search).trim() : undefined;
    const sort = args.sort ? String(args.sort).toLowerCase() : undefined;
    return getAllItems(search || undefined, category || undefined, sort);
  },
  get_recipe_items: async (args) => getRecipeByItemId(args.item_id),
  get_stock: async (args) => getStockByIngredientId(args.ingredient_id),
  adjust_stock: async (args) => adjustQuantity(args.ingredient_id, args.delta),
  create_order: async (args) => createOrder(args),
  update_order_status: async (args) =>
    updateOrderStatus(args.order_id, args.order_status),
  create_order_item: async (args) => createOrderItem(args),

  // ── Cálculo financeiro em JS puro (nunca pelo modelo) ─────────────────────
  calculate_invoice_totals: async (args) => {
    const orderId = Number(args.order_id);
    const taxRate  = args.tax_rate != null ? Number(args.tax_rate) : undefined;

    // 1. Buscar todos os itens do pedido
    const orderItems = await getItemsByOrderId(orderId);
    if (!orderItems?.length) {
      return { error: `Nenhum item encontrado para o pedido ${orderId}.` };
    }

    // 2. Enriquecer com preço unitário (busca paralela)
    const enriched = await Promise.all(
      orderItems.map(async (oi) => {
        const item = await getItemById(oi.item_id);
        return {
          price:    Number(item?.price ?? 0),
          quantity: Number(oi.quantity ?? 1),
          name:     item?.name ?? `item_${oi.item_id}`,
        };
      }),
    );

    // 3. Calcular totais em JS — sem IA
    const totals = calculateInvoiceTotals({
      items:   enriched,
      taxRate: taxRate,
    });

    return {
      order_id:        orderId,
      items:           enriched,
      subtotal_amount: totals.subtotal,
      tax_rate:        totals.taxRate,
      tax_amount:      totals.taxAmount,
      total_amount:    totals.total,
      profit_margin:   calculateProfitMargin(totals.total),
    };
  },

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

  get_reservation: async (args) => {
    if (args.reservation_id) return getReservationById(args.reservation_id);
    if (args.user_id)        return getActiveReservationByCustomerId(args.user_id);
    if (args.table_id)       return getReservationsByTableId(args.table_id);
    return null;
  },

  create_reservation: async (args) => createReservation(args),

  cancel_reservation: async (args) => {
    const reservation = await getReservationById(args.reservation_id);
    if (!reservation) return { error: `Reserva ${args.reservation_id} não encontrada.` };

    await cancelReservation(args.reservation_id);

    if (reservation.table_id) {
      await updateTableStatus(reservation.table_id, "Available");
    }

    return { success: true, reservation_id: args.reservation_id, table_freed: reservation.table_id ?? null };
  },
};

// ── SmartBistroChatProcessor ───────────────────────────────────────────────────
class SmartBistroChatProcessor extends BaseChatProcessor {
  constructor(customerName = null) { // customerName mantido por retrocompat com chatBotController
    super({
      toolConfig: ALL_DECLARATIONS,
      functionHandlers: FUNCTION_HANDLERS,
    });
    this.customerName = customerName;
    this.history = [];
  }

  getSystemPrompt() {
    return CHATBOT_SYSTEM_PROMPT(this.customerName);
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

// ROLE_USER=2, ROLE_ASSISTANT=3 (igual ao chatHistoryService)
async function getOrCreateSession(conversationId, customerName = null) {
  if (sessions.has(conversationId)) return sessions.get(conversationId);

  const processor = new SmartBistroChatProcessor(customerName);

  // Carrega histórico da BD para restaurar contexto após reinício do servidor
  try {
    const rows = await getChatHistoryByConversationId(conversationId);
    processor.history = rows.map((r) => ({
      role:    r.role_id === 2 ? "user" : "assistant",
      content: r.content,
    }));
  } catch {
    // Sem histórico ou erro — começa em limpo
  }

  sessions.set(conversationId, processor);
  return processor;
}

/**
 * Processa uma mensagem com streaming SSE e function calling.
 * Interface compatível com chatBotController.js.
 */
export async function processChatStream(
  message,
  conversationId,
  { onChunk, onDone, onError },
  customerName = null,
) {
  const processor = await getOrCreateSession(String(conversationId), customerName);
  try {
    const result = await processor.chat(message, onChunk);
    if (onDone) onDone(result.message || "", result.functionResults ?? []);
  } catch (err) {
    const classified = classifyGroqError(err);
    const pe = new PipelineError(classified.userMessage, {
      code: `GROQ_${classified.type}`,
      stage: 'provider',
      details: { message: err?.message },
      cause: err,
    });
    pe.groqType = classified.type;
    pe.originalError = err;

    if (onError) onError(pe);
    else throw pe;
  }
}

// Remove a sessão da memória (usar quando a conversa é eliminada)
export function clearSession(conversationId) {
  sessions.delete(String(conversationId));
}
