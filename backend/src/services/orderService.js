import { db } from "../db.js";
import { mapOrderDTOResponse } from "../dto/mapDTO.js";

// Devolve todos os pedidos; suporta filtragem por status e service_type
export const getAllOrders = async (status, serviceType) => {
  let q = "SELECT * FROM orders";
  const p = [];
  const conditions = [];

  if (status) {
    conditions.push("order_status = ?");
    p.push(status);
  }
  if (serviceType) {
    conditions.push("service_type = ?");
    p.push(serviceType);
  }
  if (conditions.length) q += " WHERE " + conditions.join(" AND ");
  q += " ORDER BY created_at DESC";

  const [r] = await db.query(q, p);
  return r.map(mapOrderDTOResponse);
};

// Devolve um pedido pelo ID ou null se não existir
export const getOrderById = async (id) => {
  const [r] = await db.query("SELECT * FROM orders WHERE id = ?", [id]);
  return r[0] ? mapOrderDTOResponse(r[0]) : null;
};

// Devolve todos os pedidos de um cliente
export const getOrdersByCustomerId = async (customerId) => {
  const [r] = await db.query(
    "SELECT * FROM orders WHERE customer_id = ? ORDER BY created_at DESC",
    [customerId],
  );
  return r.map(mapOrderDTOResponse);
};

// Devolve todos os pedidos pendentes na cozinha (KDS)
export const getPendingOrders = async () => {
  const [r] = await db.query(
    "SELECT * FROM orders WHERE order_status = 'Pending' ORDER BY created_at ASC",
  );
  return r.map(mapOrderDTOResponse);
};

// Cria um novo pedido e devolve o registo criado
export const createOrder = async (data) => {
  const [result] = await db.query(
    `INSERT INTO orders
      (customer_id, table_id, service_type, allergy_restrictions, kitchen_sequence_json, order_status)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [
      data.customer_id ?? null,
      data.table_id ?? null,
      data.service_type,
      data.allergy_restrictions ?? null,
      JSON.stringify(data.kitchen_sequence_json),
      data.order_status ?? "Pending",
    ],
  );
  return mapOrderDTOResponse({
    id: result.insertId,
    customer_id: data.customer_id ?? null,
    table_id: data.table_id ?? null,
    service_type: data.service_type,
    allergy_restrictions: data.allergy_restrictions ?? null,
    kitchen_sequence_json: data.kitchen_sequence_json,
    order_status: data.order_status ?? "Pending",
    created_at: new Date(),
  });
};

// Actualiza os campos fornecidos dinamicamente
export const updateOrder = async (id, data) => {
  const fields = [],
    values = [],
    add = (c, v) => {
      fields.push(c + " = ?");
      values.push(v);
    };
  if (data.allergy_restrictions !== undefined) add("allergy_restrictions", data.allergy_restrictions);
  if (data.kitchen_sequence_json !== undefined) add("kitchen_sequence_json", JSON.stringify(data.kitchen_sequence_json));
  if (data.order_status !== undefined) add("order_status", data.order_status);
  if (!fields.length) return 0;
  values.push(id);
  const [r] = await db.query(
    `UPDATE orders SET ${fields.join(", ")} WHERE id = ?`,
    values,
  );
  return r.affectedRows;
};

// Actualiza apenas o status do pedido
export const updateOrderStatus = async (id, orderStatus) => {
  const [r] = await db.query(
    "UPDATE orders SET order_status = ? WHERE id = ?",
    [orderStatus, id],
  );
  return r.affectedRows;
};

// Elimina um pedido e devolve o número de linhas afectadas
export const deleteOrder = async (id) => {
  const [r] = await db.query("DELETE FROM orders WHERE id = ?", [id]);
  return r.affectedRows;
};
