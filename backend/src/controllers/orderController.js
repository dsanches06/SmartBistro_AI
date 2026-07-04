import {
  getAllOrders,
  getPendingOrders,
  getOrderById,
  getOrdersByCustomerId,
  createOrder,
  updateOrder,
  updateOrderStatus,
  getOrdersForAutoAdvance,
  deleteOrder,
  createInvoice,
  invoiceExistsForOrder,
  createNotification,
  getActiveItems,
  getRecipeByItemId,
  getStockByIngredientId,
} from "../services/index.js";
import { calculateInvoiceTotals } from "../utils/financialUtil.js";
import { asyncHandler } from "../utils/index.js";

// Verifica stock para os itens do pedido. Devolve array de nomes de itens indisponíveis.
async function checkStockForKitchenItems(kitchenItems) {
  try {
    const activeItems = await getActiveItems();
    const nameMap = new Map(activeItems.map(i => [i.name.toLowerCase().trim(), i]));
    const unavailable = [];

    for (const kItem of kitchenItems) {
      const menuItem = nameMap.get((kItem.name ?? '').toLowerCase().trim());
      if (!menuItem) continue;

      const recipe = await getRecipeByItemId(menuItem.id);
      if (!recipe.length) continue; // sem ficha técnica → assume disponível

      for (const ri of recipe) {
        const stock = await getStockByIngredientId(ri.ingredient_id);
        const required = Number(ri.required_quantity) * Number(kItem.quantity || 1);
        const available = Number(stock?.available_quantity ?? 0);
        if (available < required) { unavailable.push(kItem.name); break; }
      }
    }
    return unavailable;
  } catch { return []; }
}

const SERVICE_TYPE_OPTIONS = ["Table", "Takeaway"];

// GET /orders?status=&serviceType=
export const getAll = asyncHandler(async (req, res) => {
  const { status, serviceType } = req.query;
  const orders = await getAllOrders(status, serviceType);
  res.json(orders);
});

// GET /orders/pending
export const getPending = asyncHandler(async (req, res) => {
  const orders = await getPendingOrders();
  res.json(orders);
});

// GET /orders/:id
export const getById = asyncHandler(async (req, res) => {
  const order = await getOrderById(req.params.id);
  if (!order) return res.status(404).json({ error: "Pedido não encontrado" });
  res.json(order);
});

// GET /orders/user/:userId
export const getByUserId = asyncHandler(async (req, res) => {
  res.json(await getOrdersByCustomerId(req.params.userId));
});

// POST /orders
export const create = asyncHandler(async (req, res) => {
  const { user_id, table_id, service_type, allergy_restrictions, kitchen_sequence_json, order_status } = req.body;
  if (!service_type || !kitchen_sequence_json)
    return res.status(400).json({ error: "service_type e kitchen_sequence_json são obrigatórios" });
  if (!SERVICE_TYPE_OPTIONS.includes(service_type))
    return res.status(400).json({ error: `service_type inválido. Use: ${SERVICE_TYPE_OPTIONS.join(', ')}` });
  if (order_status !== undefined && typeof order_status !== 'string')
    return res.status(400).json({ error: "order_status deve ser uma string" });

  const order = await createOrder({
    user_id, table_id, service_type, allergy_restrictions, kitchen_sequence_json, order_status,
  });

  // Takeaway Pending: verificar stock, criar fatura e notificar cliente
  if (service_type === 'Takeaway' && (order_status === 'Pending' || !order_status) && user_id) {
    try {
      let items = [];
      try {
        const raw = typeof kitchen_sequence_json === 'string' ? JSON.parse(kitchen_sequence_json) : kitchen_sequence_json;
        items = Array.isArray(raw) ? raw : [];
      } catch { items = []; }

      // Verificar stock
      const unavailable = await checkStockForKitchenItems(items);

      if (unavailable.length > 0) {
        // Itens indisponíveis — notificar e cancelar o pedido
        await updateOrderStatus(order.id, 'Cancelled').catch(() => {});
        await createNotification({
          user_id,
          title:   'Pedido cancelado — item indisponível',
          message: `Lamentamos, mas o(s) prato(s) "${unavailable.join(', ')}" não estão disponíveis para confecção neste momento. Por favor faz um novo pedido ou pede ajuda ao nosso assistente para sugerir alternativas.`,
        }).catch(e => console.error('Stock notif error:', e.message));
      } else {
        // Stock OK — criar fatura
        const { subtotal, taxAmount, total } = calculateInvoiceTotals({ items });
        const alreadyExists = await invoiceExistsForOrder(order.id);
        if (!alreadyExists) {
          await createInvoice({
            order_id:        order.id,
            subtotal_amount: subtotal,
            tax_amount:      taxAmount,
            total_amount:    total,
            profit_margin:   total,
          });
        }
        // Notificação 1 — pagamento (enviada primeiro = fica em baixo)
        await createNotification({
          user_id,
          title:   'Pagamento pendente',
          message: `O teu pedido #${order.id} (Takeaway) aguarda pagamento. Total: ${total.toFixed(2)} €.`,
        }).catch(e => console.error('Takeaway notif 1 error:', e.message));
        // Notificação 2 — confirmado (enviada por último = aparece no topo)
        await createNotification({
          user_id,
          title:   'Pedido confirmado',
          message: `O teu pedido #${order.id} (Takeaway) foi confirmado. Efectua o pagamento para iniciar a preparação.`,
        }).catch(e => console.error('Takeaway notif 2 error:', e.message));
      }
    } catch (e) {
      console.error('Takeaway invoice/notif error:', e.message);
    }
  }

  res.status(201).json(order);
});

// PUT /orders/:id
export const update = asyncHandler(async (req, res) => {
  const { allergy_restrictions, kitchen_sequence_json, order_status } = req.body;
  if (order_status !== undefined && typeof order_status !== 'string')
    return res.status(400).json({ error: "order_status deve ser uma string" });
  const affected = await updateOrder(req.params.id, {
    allergy_restrictions, kitchen_sequence_json, order_status,
  });
  if (!affected) return res.status(404).json({ error: "Pedido não encontrado" });
  res.json({ message: "Pedido actualizado com sucesso" });
});

// PATCH /orders/:id/status
export const updateStatus = asyncHandler(async (req, res) => {
  const { order_status } = req.body;
  if (!order_status)
    return res.status(400).json({ error: "Campo order_status é obrigatório" });
  if (typeof order_status !== 'string')
    return res.status(400).json({ error: "order_status deve ser uma string" });

  const affected = await updateOrderStatus(req.params.id, order_status);
  if (!affected) return res.status(404).json({ error: "Pedido não encontrado" });

  // Takeaway → "In Preparation": pagamento confirmado, notificar cliente
  if (order_status === 'In Preparation') {
    try {
      const order = await getOrderById(req.params.id);
      if (order?.service_type === 'Takeaway' && order?.user_id) {
        await createNotification({
          user_id: order.user_id,
          title:       'Pagamento confirmado',
          message:     `O pagamento do teu pedido #${req.params.id} (Takeaway) foi confirmado. O teu pedido está a ser preparado!`,
        }).catch(e => console.error('Payment confirmed notif error:', e.message));
      }
    } catch (e) {
      console.error('In Preparation notif error:', e.message);
    }
  }

  // Lógica automática quando pedido fica "Ready"
  if (order_status === 'Ready') {
    try {
      const order = await getOrderById(req.params.id);
      const isTakeaway = order?.service_type === 'Takeaway';
      const alreadyExists = await invoiceExistsForOrder(req.params.id);

      if (!alreadyExists) {
        // Mesa: criar fatura agora (Takeaway já tinha fatura criada na encomenda)
        let items = [];
        if (order?.kitchen_sequence_json) {
          try {
            const raw = typeof order.kitchen_sequence_json === 'string'
              ? JSON.parse(order.kitchen_sequence_json)
              : order.kitchen_sequence_json;
            items = Array.isArray(raw) ? raw : [];
          } catch { items = []; }
        }
        const { subtotal, taxAmount, total } = calculateInvoiceTotals({ items });
        await createInvoice({
          order_id:        req.params.id,
          subtotal_amount: subtotal,
          tax_amount:      taxAmount,
          total_amount:    total,
          profit_margin:   total,
        });

        if (order?.user_id) {
          const title   = isTakeaway ? 'Pedido pronto para entregar' : 'Pedido pronto — pagamento pendente';
          const message = isTakeaway
            ? `O teu pedido #${req.params.id} (Takeaway) está pronto. Podes vir levantar.`
            : `O teu pedido #${req.params.id} está pronto. Total a pagar: ${total.toFixed(2)} €.`;
          await createNotification({ user_id: order.user_id, title, message })
            .catch(e => console.error('Auto-notif error:', e.message));
        }
      } else if (isTakeaway && order?.user_id) {
        // Takeaway já tem fatura (pago) — notifica que está pronto e agenda entrega
        await createNotification({
          user_id: order.user_id,
          title:       'Pedido pronto para entregar',
          message:     `O teu pedido #${req.params.id} (Takeaway) está pronto. A preparar entrega...`,
        }).catch(e => console.error('Auto-notif error:', e.message));
      }

      // Takeaway: auto-transição Ready → Delivered após 30 segundos
      if (isTakeaway) {
        const orderId = req.params.id;
        setTimeout(async () => {
          try {
            await updateOrderStatus(orderId, 'Delivered');
            const o = await getOrderById(orderId);
            if (o?.user_id) {
              await createNotification({
                user_id: o.user_id,
                title:       'Pedido entregue',
                message:     `O teu pedido #${orderId} (Takeaway) foi entregue. Obrigado pela tua preferência!`,
              }).catch(() => {});
            }
          } catch { /* silent */ }
        }, 30_000);
      }
    } catch (invoiceErr) {
      console.error('Auto-invoice error:', invoiceErr.message);
    }
  }

  // Notificação "Pedido entregue" quando status → Delivered
  if (order_status === 'Delivered') {
    try {
      const order = await getOrderById(req.params.id);
      if (order?.user_id) {
        await createNotification({
          user_id: order.user_id,
          title:       'Pedido entregue',
          message:     `O teu pedido #${req.params.id} (${order.service_type ?? 'Takeaway'}) foi entregue. Obrigado pela tua preferência!`,
        }).catch(e => console.error('Delivered notif error:', e.message));
      }
    } catch (e) {
      console.error('Delivered notif error:', e.message);
    }
  }

  res.json({ message: `Status do pedido actualizado para ${order_status}` });
});

// DELETE /orders/:id
export const remove = asyncHandler(async (req, res) => {
  const affected = await deleteOrder(req.params.id);
  if (!affected) return res.status(404).json({ error: "Pedido não encontrado" });
  res.json({ message: "Pedido eliminado com sucesso" });
});

// POST /orders/auto-advance — avança estados automaticamente, sem restrição de admin
export const autoAdvance = asyncHandler(async (req, res) => {
  const TARGETS_S = { "In Preparation": 60, Ready: 30 };
  const NEXT      = { "In Preparation": "Ready", Ready: "Delivered" };

  const orders  = await getOrdersForAutoAdvance();
  const now     = Date.now();
  const advanced = [];

  for (const order of orders) {
    const next   = NEXT[order.order_status];
    if (!next) continue;
    const ref     = new Date(order.updated_at || order.created_at).getTime();
    const elapsed = (now - ref) / 1000;
    if (elapsed >= TARGETS_S[order.order_status]) {
      await updateOrderStatus(order.id, next);
      advanced.push({ id: order.id, from: order.order_status, to: next });

      // Notificações ao cliente: apenas para Takeaway (mesa = Maître entrega presencialmente)
      const isTakeaway = order.service_type === 'Takeaway';
      if (isTakeaway && order.user_id) {
        if (next === 'Ready') {
          createNotification({
            user_id: order.user_id,
            title:   'O teu pedido está pronto! 🍽️',
            message: `O pedido #${order.id} está pronto. O Maître irá entregá-lo em breve.`,
          }).catch(() => {});
        } else if (next === 'Delivered') {
          createNotification({
            user_id: order.user_id,
            title:   'Pedido entregue! 🚀',
            message: `O pedido #${order.id} foi entregue pelo Maître. Bom apetite!`,
          }).catch(() => {});
        }
      }
    }
  }

  res.json({ advanced, count: advanced.length });
});
