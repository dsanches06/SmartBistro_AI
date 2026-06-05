import {
  getAllOrders,
  getPendingOrders,
  getOrderById,
  getOrdersByCustomerId,
  createOrder,
  updateOrder,
  updateOrderStatus,
  deleteOrder,
  createInvoice,
  invoiceExistsForOrder,
  createNotification,
} from "../services/index.js";
import { calculateInvoiceTotals } from "../utils/financialUtil.js";

const SERVICE_TYPE_OPTIONS = ["Table", "Takeaway"];

// GET /orders?status=&serviceType=
export const getAll = async (req, res) => {
  try {
    const { status, serviceType } = req.query;
    const orders = await getAllOrders(status, serviceType);
    res.json(orders);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// GET /orders/pending
export const getPending = async (req, res) => {
  try {
    const orders = await getPendingOrders();
    res.json(orders);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// GET /orders/:id
export const getById = async (req, res) => {
  try {
    const order = await getOrderById(req.params.id);
    if (!order) return res.status(404).json({ error: "Pedido não encontrado" });
    res.json(order);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// GET /orders/customer/:customerId
export const getByCustomerId = async (req, res) => {
  try {
    res.json(await getOrdersByCustomerId(req.params.customerId));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// POST /orders
export const create = async (req, res) => {
  try {
    const { customer_id, table_id, service_type, allergy_restrictions, kitchen_sequence_json, order_status } = req.body;
    if (!service_type || !kitchen_sequence_json)
      return res.status(400).json({ error: "service_type e kitchen_sequence_json são obrigatórios" });
    if (!SERVICE_TYPE_OPTIONS.includes(service_type))
      return res.status(400).json({ error: `service_type inválido. Use: ${SERVICE_TYPE_OPTIONS.join(', ')}` });
    if (order_status !== undefined && typeof order_status !== 'string')
      return res.status(400).json({ error: "order_status deve ser uma string" });

    const order = await createOrder({
      customer_id, table_id, service_type, allergy_restrictions, kitchen_sequence_json, order_status,
    });
    res.status(201).json(order);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// PUT /orders/:id
export const update = async (req, res) => {
  try {
    const { allergy_restrictions, kitchen_sequence_json, order_status } = req.body;
    if (order_status !== undefined && typeof order_status !== 'string')
      return res.status(400).json({ error: "order_status deve ser uma string" });
    const affected = await updateOrder(req.params.id, {
      allergy_restrictions, kitchen_sequence_json, order_status,
    });
    if (!affected) return res.status(404).json({ error: "Pedido não encontrado" });
    res.json({ message: "Pedido actualizado com sucesso" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// PATCH /orders/:id/status
export const updateStatus = async (req, res) => {
  try {
    const { order_status } = req.body;
    if (!order_status)
      return res.status(400).json({ error: "Campo order_status é obrigatório" });
    if (typeof order_status !== 'string')
      return res.status(400).json({ error: "order_status deve ser uma string" });

    const affected = await updateOrderStatus(req.params.id, order_status);
    if (!affected) return res.status(404).json({ error: "Pedido não encontrado" });

    // Criar fatura + notificação automaticamente quando pedido fica "Ready"
    if (order_status === 'Ready') {
      try {
        const alreadyExists = await invoiceExistsForOrder(req.params.id);
        if (!alreadyExists) {
          const order = await getOrderById(req.params.id);
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

          // Notificar o cliente para efectuar o pagamento
          if (order?.customer_id) {
            await createNotification({
              customer_id: order.customer_id,
              title:       'Pedido pronto — pagamento pendente',
              message:     `O teu pedido #${req.params.id} (${order.service_type ?? 'Takeaway'}) está pronto. Total a pagar: ${total.toFixed(2)} €.`,
            }).catch(e => console.error('Auto-notif error:', e.message));
          }
        }
      } catch (invoiceErr) {
        console.error('Auto-invoice error:', invoiceErr.message);
      }
    }

    res.json({ message: `Status do pedido actualizado para ${order_status}` });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// DELETE /orders/:id
export const remove = async (req, res) => {
  try {
    const affected = await deleteOrder(req.params.id);
    if (!affected) return res.status(404).json({ error: "Pedido não encontrado" });
    res.json({ message: "Pedido eliminado com sucesso" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
