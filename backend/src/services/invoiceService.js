import { db } from "../db.js";
import { mapInvoiceDTOResponse } from "../dto/mapDTO.js";

// Devolve todas as faturas ordenadas da mais recente
export const getAllInvoices = async () => {
  const [r] = await db.query("SELECT * FROM invoices ORDER BY issued_at DESC");
  return r.map(mapInvoiceDTOResponse);
};

// Devolve uma fatura pelo ID ou null se não existir
export const getInvoiceById = async (id) => {
  const [r] = await db.query("SELECT * FROM invoices WHERE id = ?", [id]);
  return r[0] ? mapInvoiceDTOResponse(r[0]) : null;
};

// Devolve a fatura de um pedido específico (order_id é UNIQUE)
export const getInvoiceByOrderId = async (orderId) => {
  const [r] = await db.query(
    "SELECT * FROM invoices WHERE order_id = ?",
    [orderId],
  );
  return r[0] ? mapInvoiceDTOResponse(r[0]) : null;
};

// Verifica se já existe fatura para o pedido
export const invoiceExistsForOrder = async (orderId, excludeId = null) => {
  const q = excludeId
    ? "SELECT 1 FROM invoices WHERE order_id = ? AND id <> ? LIMIT 1"
    : "SELECT 1 FROM invoices WHERE order_id = ? LIMIT 1";
  const p = excludeId ? [orderId, excludeId] : [orderId];
  const [r] = await db.query(q, p);
  return r.length > 0;
};

// Cria uma nova fatura e devolve o registo criado
export const createInvoice = async (data) => {
  const [result] = await db.query(
    `INSERT INTO invoices
      (order_id, subtotal_amount, tax_amount, total_amount, profit_margin)
     VALUES (?, ?, ?, ?, ?)`,
    [
      data.order_id,
      data.subtotal_amount,
      data.tax_amount,
      data.total_amount,
      data.profit_margin,
    ],
  );
  return mapInvoiceDTOResponse({
    id: result.insertId,
    order_id: data.order_id,
    subtotal_amount: data.subtotal_amount,
    tax_amount: data.tax_amount,
    total_amount: data.total_amount,
    profit_margin: data.profit_margin,
    issued_at: new Date(),
  });
};

// Actualiza os campos fornecidos dinamicamente
export const updateInvoice = async (id, data) => {
  const fields = [],
    values = [],
    add = (c, v) => {
      fields.push(c + " = ?");
      values.push(v);
    };
  if (data.subtotal_amount !== undefined) add("subtotal_amount", data.subtotal_amount);
  if (data.tax_amount !== undefined) add("tax_amount", data.tax_amount);
  if (data.total_amount !== undefined) add("total_amount", data.total_amount);
  if (data.profit_margin !== undefined) add("profit_margin", data.profit_margin);
  if (!fields.length) return 0;
  values.push(id);
  const [r] = await db.query(
    `UPDATE invoices SET ${fields.join(", ")} WHERE id = ?`,
    values,
  );
  return r.affectedRows;
};

// Elimina uma fatura e devolve o número de linhas afectadas
export const deleteInvoice = async (id) => {
  const [r] = await db.query("DELETE FROM invoices WHERE id = ?", [id]);
  return r.affectedRows;
};
