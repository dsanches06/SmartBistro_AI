import { db } from "../db.js";
import { mapPaymentDTOResponse } from "../dto/mapDTO.js";

// Devolve todos os pagamentos; suporta filtragem por status e método de pagamento
export const getAllPayments = async (status, paymentMethod) => {
  let q = "SELECT * FROM payments";
  const p = [];
  const conditions = [];

  if (status) {
    conditions.push("payment_status = ?");
    p.push(status);
  }
  if (paymentMethod) {
    conditions.push("payment_method = ?");
    p.push(paymentMethod);
  }
  if (conditions.length) q += " WHERE " + conditions.join(" AND ");
  q += " ORDER BY processed_at DESC";

  const [r] = await db.query(q, p);
  return r.map(mapPaymentDTOResponse);
};

// Devolve um pagamento pelo ID ou null se não existir
export const getPaymentById = async (id) => {
  const [r] = await db.query("SELECT * FROM payments WHERE id = ?", [id]);
  return r[0] ? mapPaymentDTOResponse(r[0]) : null;
};

// Devolve o pagamento de uma fatura específica (invoice_id é UNIQUE)
export const getPaymentByInvoiceId = async (invoiceId) => {
  const [r] = await db.query(
    "SELECT * FROM payments WHERE invoice_id = ?",
    [invoiceId],
  );
  return r[0] ? mapPaymentDTOResponse(r[0]) : null;
};

// Devolve todos os pagamentos de um cliente
export const getPaymentsByCustomerId = async (customerId) => {
  const [r] = await db.query(
    "SELECT * FROM payments WHERE customer_id = ? ORDER BY processed_at DESC",
    [customerId],
  );
  return r.map(mapPaymentDTOResponse);
};

// Cria um novo registo de pagamento (estado inicial: Pending)
export const createPayment = async (data) => {
  const [result] = await db.query(
    `INSERT INTO payments
      (invoice_id, customer_id, amount, payment_method, payment_status, processed_at)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [
      data.invoice_id,
      data.customer_id,
      data.amount,
      data.payment_method ?? "MB Way",
      data.payment_status ?? "Pending",
      data.processed_at ?? null,
    ],
  );
  return mapPaymentDTOResponse({
    id: result.insertId,
    invoice_id: data.invoice_id,
    customer_id: data.customer_id,
    amount: data.amount,
    payment_method: data.payment_method ?? "MB Way",
    payment_status: data.payment_status ?? "Pending",
    processed_at: data.processed_at ?? null,
  });
};

// Actualiza os campos fornecidos dinamicamente
export const updatePayment = async (id, data) => {
  const fields = [],
    values = [],
    add = (c, v) => {
      fields.push(c + " = ?");
      values.push(v);
    };
  if (data.payment_method !== undefined) add("payment_method", data.payment_method);
  if (data.payment_status !== undefined) add("payment_status", data.payment_status);
  if (data.processed_at !== undefined) add("processed_at", data.processed_at);
  if (!fields.length) return 0;
  values.push(id);
  const [, r] = await db.query(
    `UPDATE payments SET ${fields.join(", ")} WHERE id = ?`,
    values,
  );
  return r.affectedRows;
};

// Processa o pagamento: define status Completed e regista a data/hora actual
export const processPayment = async (id) => {
  const now = new Date();
  const [, r] = await db.query(
    "UPDATE payments SET payment_status = 'Completed', processed_at = ? WHERE id = ?",
    [now, id],
  );
  return r.affectedRows;
};

// Marca o pagamento como falhado
export const failPayment = async (id) => {
  const [, r] = await db.query(
    "UPDATE payments SET payment_status = 'Failed' WHERE id = ?",
    [id],
  );
  return r.affectedRows;
};

// Elimina um pagamento e devolve o número de linhas afectadas
export const deletePayment = async (id) => {
  const [, r] = await db.query("DELETE FROM payments WHERE id = ?", [id]);
  return r.affectedRows;
};
