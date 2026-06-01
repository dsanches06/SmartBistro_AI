import { db } from "../db.js";
import { mapOrderDTOResponse } from "../dto/mapDTO.js";

const ORDER_STATUS_OPTIONS = [
  "Pending", "In Preparation", "Ready", "Done", "Delivered", "Cancelled",
];

const normalizeOrderStatus = (orderStatus) => {
  if (typeof orderStatus !== "string") return "Pending";
  const normalized = orderStatus.trim();
  const exactMatch = ORDER_STATUS_OPTIONS.find(
    (o) => o.toLowerCase() === normalized.toLowerCase(),
  );
  if (exactMatch) return exactMatch;
  const lower = normalized.toLowerCase();
  if (lower.includes("pending"))                                   return "Pending";
  if (lower.includes("in preparation") || lower.includes("preparation")) return "In Preparation";
  if (lower.includes("ready"))                                     return "Ready";
  if (lower.includes("done"))                                      return "Done";
  if (lower.includes("deliver"))                                   return "Delivered";
  if (lower.includes("cancel"))                                    return "Cancelled";
  return "Pending";
};

// Base SELECT com JOIN para incluir o nome do cliente
const SELECT_ORDERS = `
  SELECT o.*, c.name AS customer_name
  FROM orders o
  LEFT JOIN customers c ON c.id = o.customer_id
`;

// Devolve todos os pedidos com filtro opcional de status / service_type
export const getAllOrders = async (status, serviceType) => {
  let q = SELECT_ORDERS;
  const p = [];
  const conditions = [];
  if (status)      { conditions.push("o.order_status = ?");   p.push(status); }
  if (serviceType) { conditions.push("o.service_type = ?");   p.push(serviceType); }
  if (conditions.length) q += " WHERE " + conditions.join(" AND ");
  q += " ORDER BY o.created_at DESC";
  const [r] = await db.query(q, p);
  return r.map(mapOrderDTOResponse);
};

// Devolve um pedido pelo ID
export const getOrderById = async (id) => {
  const [r] = await db.query(SELECT_ORDERS + " WHERE o.id = ?", [id]);
  return r[0] ? mapOrderDTOResponse(r[0]) : null;
};

// Devolve todos os pedidos de um cliente
export const getOrdersByCustomerId = async (customerId) => {
  const [r] = await db.query(
    SELECT_ORDERS + " WHERE o.customer_id = ? ORDER BY o.created_at DESC",
    [customerId],
  );
  return r.map(mapOrderDTOResponse);
};

// Devolve todos os pedidos pendentes na cozinha (KDS)
export const getPendingOrders = async () => {
  const [r] = await db.query(
    SELECT_ORDERS + " WHERE o.order_status = 'Pending' ORDER BY o.created_at ASC",
  );
  return r.map(mapOrderDTOResponse);
};

// Cria um novo pedido
export const createOrder = async (data) => {
  const orderStatus = normalizeOrderStatus(data.order_status ?? "Pending");
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
      orderStatus,
    ],
  );
  return mapOrderDTOResponse({
    id: result.insertId,
    customer_id: data.customer_id ?? null,
    customer_name: data.customer_name ?? null,
    table_id: data.table_id ?? null,
    service_type: data.service_type,
    allergy_restrictions: data.allergy_restrictions ?? null,
    kitchen_sequence_json: data.kitchen_sequence_json,
    order_status: orderStatus,
    created_at: new Date(),
  });
};

// Actualiza os campos fornecidos dinamicamente
export const updateOrder = async (id, data) => {
  const fields = [], values = [],
    add = (c, v) => { fields.push(c + " = ?"); values.push(v); };
  if (data.allergy_restrictions  !== undefined) add("allergy_restrictions",  data.allergy_restrictions);
  if (data.kitchen_sequence_json !== undefined) add("kitchen_sequence_json", JSON.stringify(data.kitchen_sequence_json));
  if (data.order_status          !== undefined) add("order_status",          normalizeOrderStatus(data.order_status));
  if (!fields.length) return 0;
  values.push(id);
  const [r] = await db.query(`UPDATE orders SET ${fields.join(", ")} WHERE id = ?`, values);
  return r.affectedRows;
};

// Actualiza apenas o status do pedido
export const updateOrderStatus = async (id, orderStatus) => {
  const [r] = await db.query(
    "UPDATE orders SET order_status = ? WHERE id = ?",
    [normalizeOrderStatus(orderStatus), id],
  );
  return r.affectedRows;
};

// Elimina um pedido
export const deleteOrder = async (id) => {
  const [r] = await db.query("DELETE FROM orders WHERE id = ?", [id]);
  return r.affectedRows;
};
