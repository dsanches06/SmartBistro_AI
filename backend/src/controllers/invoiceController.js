import {
  getAllInvoices,
  getInvoiceById,
  getInvoiceByOrderId,
  invoiceExistsForOrder,
  createInvoice,
  updateInvoice,
  deleteInvoice,
  getOrderById,
} from "../services/index.js";
import { asyncHandler } from "../utils/index.js";

// GET /invoices
export const getAll = asyncHandler(async (req, res) => {
  const invoices = await getAllInvoices();
  res.json(invoices);
});

// GET /invoices/:id
export const getById = asyncHandler(async (req, res) => {
  const invoice = await getInvoiceById(req.params.id);
  if (!invoice) return res.status(404).json({ error: "Fatura não encontrada" });
  res.json(invoice);
});

// GET /invoices/order/:orderId
export const getByOrderId = asyncHandler(async (req, res) => {
  const invoice = await getInvoiceByOrderId(req.params.orderId);
  if (!invoice) return res.status(404).json({ error: "Fatura para esse pedido não encontrada" });
  res.json(invoice);
});

// POST /invoices
export const create = asyncHandler(async (req, res) => {
  const { order_id, subtotal_amount, tax_amount, total_amount, profit_margin } = req.body;
  if (!order_id || subtotal_amount === undefined || tax_amount === undefined || total_amount === undefined || profit_margin === undefined)
    return res.status(400).json({ error: "order_id, subtotal_amount, tax_amount, total_amount e profit_margin são obrigatórios" });

  const order = await getOrderById(order_id);
  if (!order) return res.status(404).json({ error: "Pedido não encontrado" });

  const exists = await invoiceExistsForOrder(order_id);
  if (exists) return res.status(409).json({ error: "Já existe fatura para esse pedido" });

  const invoice = await createInvoice({ order_id, subtotal_amount, tax_amount, total_amount, profit_margin });
  res.status(201).json(invoice);
});

// PUT /invoices/:id
export const update = asyncHandler(async (req, res) => {
  const { subtotal_amount, tax_amount, total_amount, profit_margin } = req.body;
  const affected = await updateInvoice(req.params.id, { subtotal_amount, tax_amount, total_amount, profit_margin });
  if (!affected) return res.status(404).json({ error: "Fatura não encontrada" });
  res.json({ message: "Fatura actualizada com sucesso" });
});

// DELETE /invoices/:id
export const remove = asyncHandler(async (req, res) => {
  const affected = await deleteInvoice(req.params.id);
  if (!affected) return res.status(404).json({ error: "Fatura não encontrada" });
  res.json({ message: "Fatura eliminada com sucesso" });
});
