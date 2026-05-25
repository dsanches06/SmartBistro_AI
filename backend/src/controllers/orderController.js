import * as orderService from "../services/orderService.js";

// GET /orders?status=&serviceType=
export const getAll = async (req, res) => {
  try {
    const { status, serviceType } = req.query;
    const orders = await orderService.getAllOrders(status, serviceType);
    res.json(orders);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// GET /orders/pending
export const getPending = async (req, res) => {
  try {
    const orders = await orderService.getPendingOrders();
    res.json(orders);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// GET /orders/:id
export const getById = async (req, res) => {
  try {
    const order = await orderService.getOrderById(req.params.id);
    if (!order) return res.status(404).json({ error: "Pedido não encontrado" });
    res.json(order);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// GET /orders/customer/:customerId
export const getByCustomerId = async (req, res) => {
  try {
    const orders = await orderService.getOrdersByCustomerId(req.params.customerId);
    res.json(orders);
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

    const order = await orderService.createOrder({
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
    const affected = await orderService.updateOrder(req.params.id, {
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

    const affected = await orderService.updateOrderStatus(req.params.id, order_status);
    if (!affected) return res.status(404).json({ error: "Pedido não encontrado" });
    res.json({ message: `Status do pedido actualizado para ${order_status}` });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// DELETE /orders/:id
export const remove = async (req, res) => {
  try {
    const affected = await orderService.deleteOrder(req.params.id);
    if (!affected) return res.status(404).json({ error: "Pedido não encontrado" });
    res.json({ message: "Pedido eliminado com sucesso" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
