import { BaseChatProcessor } from "../models/index.js";
import { CHATBOT_SYSTEM_PROMPT } from "../config/index.js";
import {
  classifyClaudeError,
  calculateInvoiceTotals,
  calculateProfitMargin,
} from "../../utils/index.js";
import { PipelineError } from "../../utils/pipelineError.js";

// ── Declarações das ferramentas expostas ao chatbot ──────────────────────────
// Apenas funções que o chatbot (orquestrador) pode chamar directamente.
// Stock, stock, create_order, etc. são internos ao pipeline — não expostos ao Claude.
import {
  getUserFunctionDeclaration,
  findOrCreateUserFunctionDeclaration,
} from "../functions/users/index.js";
import {
  getTableFunctionDeclaration,
  updateTableStatusFunctionDeclaration,
} from "../functions/tables/index.js";
import { getItemsFunctionDeclaration } from "../functions/items/index.js";
import {
  updateOrderStatusFunctionDeclaration,
  submitOrderFunctionDeclaration,
  getOrderFunctionDeclaration,
} from "../functions/orders/index.js";
import { generateInvoiceFunctionDeclaration } from "../functions/invoices/index.js";
import {
  getReservationFunctionDeclaration,
  createReservationFunctionDeclaration,
  cancelReservationFunctionDeclaration,
  createGroupReservationFunctionDeclaration,
} from "../functions/reservations/index.js";
import {
  getCustomerPointsFunctionDeclaration,
  redeemCustomerPointsFunctionDeclaration,
} from "../functions/points/index.js";

// ── Services (operações reais na BD) ──────────────────────────────────────────
import { getChatHistoryByConversationId } from "../../services/index.js";
import { getUserPoints, redeemPoints } from "../../services/pointsService.js";
import { runOrderPipeline } from "./orderOrchestrator.js";
import {
  getUserById, getAllUsers, findOrCreateUser,
  getTableById, getAllTables, updateTableStatus,
  getAllItems, getItemsByOrderId,
  createOrder, updateOrderStatus, createOrderItem,
  getOrderById, getOrdersByCustomerId,
  createInvoice, updatePayment,
  createNotification, createLog,
  getReservationById, getActiveReservationByCustomerId,
  getReservationsByTableId, createReservation, cancelReservation,
} from "../../services/index.js";

const fmtTable = (n) => `T${String(n).replace(/^[Tt]/, "").padStart(2, "0")}`;

// ── Ferramentas expostas ao Claude (chatbot orquestrador) ─────────────────────
const ALL_DECLARATIONS = [
  findOrCreateUserFunctionDeclaration,   // identificar cliente
  getUserFunctionDeclaration,            // consultar cliente
  getTableFunctionDeclaration,           // encontrar mesa disponível
  updateTableStatusFunctionDeclaration,  // ocupar / libertar mesa
  getItemsFunctionDeclaration,           // mostrar menu por categoria
  updateOrderStatusFunctionDeclaration,  // actualizar estado do pedido
  submitOrderFunctionDeclaration,        // submeter pedido ao pipeline Maître→Chef
  getOrderFunctionDeclaration,           // consultar estado de um pedido
  generateInvoiceFunctionDeclaration,    // gerar fatura via Cashier (quando cliente pede conta)
  getReservationFunctionDeclaration,              // consultar reserva
  createReservationFunctionDeclaration,           // criar reserva (1 mesa)
  cancelReservationFunctionDeclaration,           // cancelar reserva
  createGroupReservationFunctionDeclaration,      // reserva com mesas juntadas
  getCustomerPointsFunctionDeclaration,  // consultar pontos de fidelidade
  redeemCustomerPointsFunctionDeclaration, // resgatar pontos
];

// ── Handlers: recebem os args do Claude e executam operações na BD ────────────
export const FUNCTION_HANDLERS = {
  find_or_create_user: async (args) => {
    // Alguns modelos passam name como objecto em vez de string — coagir defensivamente
    let name = args.name;
    if (typeof name === "object" && name !== null) {
      name =
        name.name ??
        name.full_name ??
        name.value ??
        Object.values(name).filter(Boolean).join(" ");
    }
    return findOrCreateUser(String(name ?? "").trim(), args.phone ?? null);
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
  get_table: async (args) => {
    if (args.table_id) return getTableById(args.table_id);
    const tables = await getAllTables();
    if (args.table_number) {
      const num = String(args.table_number).replace(/^[Tt]/, "");
      return (
        tables.find(
          (t) => String(t.table_number).replace(/^[Tt]/, "") === num,
        ) ?? null
      );
    }
    const statusFilter = args.status || "Available";
    const available = tables.filter((t) => t.status === statusFilter);
    const minCap = args.min_capacity ? Number(args.min_capacity) : null;

    if (minCap) {
      const fits = available.filter((t) => t.capacity >= minCap);
      if (fits.length) {
        fits.sort((a, b) => a.capacity - b.capacity);
        return fits[0];
      }
      // Nenhuma mesa tem capacidade suficiente sozinha — devolve lista para combinar
      available.sort((a, b) => b.capacity - a.capacity);
      const totalCap = available.reduce((s, t) => s + t.capacity, 0);
      return {
        no_single_table: true,
        party_size_requested: minCap,
        total_combined_capacity: totalCap,
        available_tables: available.map((t) => ({
          id: t.id,
          table_number: t.table_number,
          capacity: t.capacity,
        })),
        suggestion: totalCap >= minCap
          ? `Juntar mesas: usa create_group_reservation com table_ids que somem >= ${minCap} lugares.`
          : `Capacidade total insuficiente (${totalCap} lugares para ${minCap} pessoas).`,
      };
    }

    available.sort((a, b) => a.capacity - b.capacity);
    return available[0] ?? null;
  },
  update_table_status: async (args) =>
    updateTableStatus(args.table_id, args.status),
  get_items: async (args) => {
    const category = args.category ? String(args.category).trim() : undefined;
    const search   = args.search   ? String(args.search).trim()   : undefined;
    const sort     = args.sort     ? String(args.sort).toLowerCase() : undefined;
    return getAllItems(search || undefined, category || undefined, sort);
  },
  update_order_status: async (args) => updateOrderStatus(args.order_id, args.order_status),

  get_order: async (args) => {
    if (args.order_id) return getOrderById(args.order_id);
    if (args.user_id) {
      const orders = await getOrdersByCustomerId(args.user_id);
      return orders[0] ?? null;
    }
    return null;
  },

  // Submete pedido ao pipeline Maître→Chef e persiste na BD.
  // Cashier NÃO é chamado aqui — só quando o cliente pedir a conta.
  submit_order: async (args) => {
    const { user_id, table_id, service_type, allergy_restrictions, items } = args;
    const isTakeaway = service_type === 'Takeaway';
    const itemsText  = items.map(i => `${i.quantity ?? 1}x ${i.name}`).join(', ');

    const { validated, sequenced } = await runOrderPipeline({
      customer_name:        `User#${user_id}`,
      user_id,
      message:              `Pedido: ${itemsText}`,
      service_type:         isTakeaway ? 'Takeaway' : 'Table',
      allergy_restrictions: allergy_restrictions || '',
      items:                items.map(i => ({ item_id: i.item_id, name: i.name, quantity: i.quantity ?? 1, price: i.price ?? 0 })),
      skipCashier:          true,
    });

    const order = await createOrder({
      user_id,
      table_id:              validated.table_id ?? table_id ?? null,
      service_type:          isTakeaway ? 'Takeaway' : 'Table',
      order_status:          'Pending',
      allergy_restrictions:  allergy_restrictions || null,
      kitchen_sequence_json: JSON.stringify(sequenced.kitchen_sequence ?? []),
    });

    await Promise.all(
      (validated.items ?? items).map(item =>
        createOrderItem({ order_id: order.id, item_id: item.item_id, quantity: item.quantity ?? 1 })
      )
    );

    return {
      success:      true,
      order_id:     order.id,
      table_id:     validated.table_id ?? table_id ?? null,
      service_type: isTakeaway ? 'Takeaway' : 'Table',
      items_count:  (validated.items ?? items).length,
      message:      `Pedido #${order.id} enviado para a cozinha.`,
    };
  },

  // Gera fatura — só quando o cliente pede a conta (Cashier calcula totais).
  generate_invoice: async (args) => {
    const { order_id, discount = 0 } = args;
    const orderItems = await getItemsByOrderId(order_id);
    const totals     = calculateInvoiceTotals({ items: orderItems });
    const total      = Math.max(0, totals.total - discount);
    const subtotal   = Number((total / 1.13).toFixed(2));
    const tax        = Number((total - subtotal).toFixed(2));

    const inv = await createInvoice({
      order_id,
      subtotal_amount: subtotal,
      tax_amount:      tax,
      total_amount:    total,
      profit_margin:   calculateProfitMargin(total, 0),
    });

    return { success: true, invoice_id: inv.id, total, message: `Fatura gerada — total: €${total.toFixed(2)}.` };
  },

  get_customer_points: async (args) => {
    const data = await getUserPoints(args.user_id);
    return {
      ...data,
      canRedeem: data.balance >= 50,
      pointValue: 0.1,
      minRedeem: 50,
    };
  },

  redeem_customer_points: async (args) => {
    const discount = await redeemPoints(args.user_id, args.points);
    return {
      success: true,
      pointsUsed: args.points,
      discount,
      message: `Desconto de €${discount.toFixed(2)} aplicado.`,
    };
  },
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
    if (args.user_id) return getActiveReservationByCustomerId(args.user_id);
    if (args.table_id) return getReservationsByTableId(args.table_id);
    return null;
  },

  create_reservation: async (args) => createReservation(args),

  // Reserva para grupo grande: mesa principal + mesas extra marcadas como Reserved
  create_group_reservation: async (args) => {
    const { table_ids, user_id, reservation_date, party_size, phone, notes } = args;
    if (!Array.isArray(table_ids) || table_ids.length < 2)
      return { error: "São necessárias pelo menos 2 mesas para uma reserva de grupo." };

    const primaryId = table_ids[0];
    const extraIds  = table_ids.slice(1);

    // Obter nomes das mesas extra para nota
    const allTables = await getAllTables();
    const extraLabels = extraIds.map((id) => {
      const t = allTables.find((t) => t.id === id);
      return t ? fmtTable(t.table_number) : `#${id}`;
    });
    const primaryLabel = (() => {
      const t = allTables.find((t) => t.id === primaryId);
      return t ? fmtTable(t.table_number) : `#${primaryId}`;
    })();

    const groupNote = `Mesas agrupadas: ${[primaryLabel, ...extraLabels].join(", ")} para ${party_size} pessoas.`;
    const finalNotes = notes ? `${notes} | ${groupNote}` : groupNote;

    // Criar reserva na mesa principal
    const reservation = await createReservation({
      user_id: user_id ?? null,
      table_id: primaryId,
      reservation_date,
      party_size,
      phone: phone ?? null,
      notes: finalNotes,
    });

    // Marcar todas as mesas como Reserved
    await Promise.all(table_ids.map((id) => updateTableStatus(id, "Reserved")));

    return {
      success: true,
      reservation_id: reservation.id,
      primary_table: primaryLabel,
      extra_tables: extraLabels,
      party_size,
      message: `Reserva #${reservation.id} criada para ${party_size} pessoas nas mesas ${[primaryLabel, ...extraLabels].join(" + ")}.`,
    };
  },

  cancel_reservation: async (args) => {
    const reservation = await getReservationById(args.reservation_id);
    if (!reservation)
      return { error: `Reserva ${args.reservation_id} não encontrada.` };

    await cancelReservation(args.reservation_id);

    if (reservation.table_id) {
      await updateTableStatus(reservation.table_id, "Available");
    }

    return {
      success: true,
      reservation_id: args.reservation_id,
      table_freed: reservation.table_id ?? null,
    };
  },
};

// ── SmartBistroChatProcessor ───────────────────────────────────────────────────
class SmartBistroChatProcessor extends BaseChatProcessor {
  constructor(customerName = null) {
    // customerName mantido por retrocompat com chatBotController
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
      role: r.role_id === 2 ? "user" : "assistant",
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
  const processor = await getOrCreateSession(
    String(conversationId),
    customerName,
  );
  try {
    const result = await processor.chat(message, onChunk);
    if (onDone) onDone(result.message || "", result.functionResults ?? []);
  } catch (err) {
    const classified = classifyClaudeError(err);
    const pe = new PipelineError(classified.userMessage, {
      code: `CLAUDE_${classified.type}`,
      stage: "provider",
      details: { message: err?.message },
      cause: err,
    });
    pe.aiErrorType = classified.type;
    pe.originalError = err;

    if (onError) onError(pe);
    else throw pe;
  }
}

// Remove a sessão da memória (usar quando a conversa é eliminada)
export function clearSession(conversationId) {
  sessions.delete(String(conversationId));
}
