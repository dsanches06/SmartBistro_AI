import { db } from "../db.js";
import { mapOrderitemDTOResponse } from "../dto/mapDTO.js";

// Devolve todos os itens de pedido
export const getAllOrderItems = async () => {
  const [r] = await db.query("SELECT * FROM order_items ORDER BY order_id, id");
  return r.map(mapOrderitemDTOResponse);
};

// Devolve um item de pedido pelo ID ou null se não existir
export const getOrderItemById = async (id) => {
  const [r] = await db.query("SELECT * FROM order_items WHERE id = ?", [id]);
  return r[0] ? mapOrderitemDTOResponse(r[0]) : null;
};

// Devolve todos os itens de um pedido específico
export const getItemsByOrderId = async (orderId) => {
  const [r] = await db.query(
    "SELECT * FROM order_items WHERE order_id = ? ORDER BY id ASC",
    [orderId],
  );
  return r.map(mapOrderitemDTOResponse);
};

// Cria um novo item de pedido e devolve o registo criado
export const createOrderItem = async (data) => {
  const [result] = await db.query(
    "INSERT INTO order_items (order_id, item_id, quantity) VALUES (?, ?, ?)",
    [data.order_id, data.item_id, data.quantity ?? 1],
  );
  return mapOrderitemDTOResponse({
    id: result.insertId,
    order_id: data.order_id,
    item_id: data.item_id,
    quantity: data.quantity ?? 1,
  });
};

// Cria múltiplos itens de pedido de uma vez (bulk insert)
export const createOrderItems = async (orderId, items) => {
  if (!items.length) return [];
  const values = items.map((i) => [orderId, i.item_id, i.quantity ?? 1]);
  const [result] = await db.query(
    "INSERT INTO order_items (order_id, item_id, quantity) VALUES ?",
    [values],
  );
  return items.map((i, idx) => mapOrderitemDTOResponse({
    id: result.insertId + idx,
    order_id: orderId,
    item_id: i.item_id,
    quantity: i.quantity ?? 1,
  }));
};

// Actualiza a quantidade de um item de pedido
export const updateOrderItem = async (id, quantity) => {
  const [r] = await db.query(
    "UPDATE order_items SET quantity = ? WHERE id = ?",
    [quantity, id],
  );
  return r.affectedRows;
};

// Elimina um item de pedido e devolve o número de linhas afectadas
export const deleteOrderItem = async (id) => {
  const [r] = await db.query("DELETE FROM order_items WHERE id = ?", [id]);
  return r.affectedRows;
};

// Elimina todos os itens de um pedido (útil ao cancelar um pedido)
export const deleteItemsByOrderId = async (orderId) => {
  const [r] = await db.query(
    "DELETE FROM order_items WHERE order_id = ?",
    [orderId],
  );
  return r.affectedRows;
};
