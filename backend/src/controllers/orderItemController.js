import {
  getAllOrderItems,
  getOrderItemById,
  getItemsByOrderId,
  createOrderItem,
  createOrderItems,
  updateOrderItem,
  deleteOrderItem,
  deleteItemsByOrderId,
} from "../services/index.js";

// GET /order-items
export const getAll = async (req, res) => {
  try {
    const orderItems = await getAllOrderItems();
    res.json(orderItems);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// GET /order-items/:id
export const getById = async (req, res) => {
  try {
    const orderItem = await getOrderItemById(req.params.id);
    if (!orderItem) return res.status(404).json({ error: "Item de pedido não encontrado" });
    res.json(orderItem);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// GET /order-items/order/:orderId
export const getByOrderId = async (req, res) => {
  try {
    const orderItems = await getItemsByOrderId(req.params.orderId);
    res.json(orderItems);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// POST /order-items
export const create = async (req, res) => {
  try {
    const { order_id, item_id, quantity } = req.body;
    if (!order_id || !item_id)
      return res.status(400).json({ error: "order_id e item_id são obrigatórios" });

    const orderItem = await createOrderItem({ order_id, item_id, quantity });
    res.status(201).json(orderItem);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// POST /order-items/bulk
export const createBulk = async (req, res) => {
  try {
    const { order_id, items } = req.body;
    if (!order_id || !Array.isArray(items) || !items.length)
      return res.status(400).json({ error: "order_id e items (array) são obrigatórios" });

    const orderItems = await createOrderItems(order_id, items);
    res.status(201).json(orderItems);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// PATCH /order-items/:id
export const updateQuantity = async (req, res) => {
  try {
    const { quantity } = req.body;
    if (quantity === undefined)
      return res.status(400).json({ error: "Campo quantity é obrigatório" });

    const affected = await updateOrderItem(req.params.id, quantity);
    if (!affected) return res.status(404).json({ error: "Item de pedido não encontrado" });
    res.json({ message: "Quantidade actualizada com sucesso" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// DELETE /order-items/:id
export const remove = async (req, res) => {
  try {
    const affected = await deleteOrderItem(req.params.id);
    if (!affected) return res.status(404).json({ error: "Item de pedido não encontrado" });
    res.json({ message: "Item de pedido eliminado com sucesso" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// DELETE /order-items/order/:orderId
export const removeByOrderId = async (req, res) => {
  try {
    const affected = await deleteItemsByOrderId(req.params.orderId);
    res.json({ message: `${affected} item(s) do pedido eliminado(s)` });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
