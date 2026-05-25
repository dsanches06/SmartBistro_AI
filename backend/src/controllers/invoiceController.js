import {
  getAllInvoices,
  getInvoiceById,
  getInvoiceByOrderId,
  invoiceExistsForOrder,
  createInvoice,
  updateInvoice,
  deleteInvoice,
} from "../services/index.js";

// GET /invoices
export const getAll = async (req, res) => {
  try {
    const invoices = await getAllInvoices();
    res.json(invoices);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// GET /invoices/:id
export const getById = async (req, res) => {
  try {
    const invoice = await getInvoiceById(req.params.id);
    if (!invoice) return res.status(404).json({ error: "Fatura não encontrada" });
    res.json(invoice);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// GET /invoices/order/:orderId
export const getByOrderId = async (req, res) => {
  try {
    const invoice = await getInvoiceByOrderId(req.params.orderId);
    if (!invoice) return res.status(404).json({ error: "Fatura para esse pedido não encontrada" });
    res.json(invoice);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// POST /invoices
export const create = async (req, res) => {
  try {
    const { order_id, subtotal_amount, tax_amount, total_amount, profit_margin } = req.body;
    if (!order_id || subtotal_amount === undefined || tax_amount === undefined || total_amount === undefined || profit_margin === undefined)
      return res.status(400).json({ error: "order_id, subtotal_amount, tax_amount, total_amount e profit_margin são obrigatórios" });

    const exists = await invoiceExistsForOrder(order_id);
    if (exists) return res.status(409).json({ error: "Já existe fatura para esse pedido" });

    const invoice = await createInvoice({ order_id, subtotal_amount, tax_amount, total_amount, profit_margin });
    res.status(201).json(invoice);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// PUT /invoices/:id
export const update = async (req, res) => {
  try {
    const { subtotal_amount, tax_amount, total_amount, profit_margin } = req.body;
    const affected = await updateInvoice(req.params.id, { subtotal_amount, tax_amount, total_amount, profit_margin });
    if (!affected) return res.status(404).json({ error: "Fatura não encontrada" });
    res.json({ message: "Fatura actualizada com sucesso" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// DELETE /invoices/:id
export const remove = async (req, res) => {
  try {
    const affected = await deleteInvoice(req.params.id);
    if (!affected) return res.status(404).json({ error: "Fatura não encontrada" });
    res.json({ message: "Fatura eliminada com sucesso" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
