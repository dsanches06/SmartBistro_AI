import * as paymentService from "../services/paymentService.js";

// GET /payments?status=&paymentMethod=
export const getAll = async (req, res) => {
  try {
    const { status, paymentMethod } = req.query;
    const payments = await paymentService.getAllPayments(status, paymentMethod);
    res.json(payments);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// GET /payments/:id
export const getById = async (req, res) => {
  try {
    const payment = await paymentService.getPaymentById(req.params.id);
    if (!payment) return res.status(404).json({ error: "Pagamento não encontrado" });
    res.json(payment);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// GET /payments/invoice/:invoiceId
export const getByInvoiceId = async (req, res) => {
  try {
    const payment = await paymentService.getPaymentByInvoiceId(req.params.invoiceId);
    if (!payment) return res.status(404).json({ error: "Pagamento para essa fatura não encontrado" });
    res.json(payment);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// GET /payments/customer/:customerId
export const getByCustomerId = async (req, res) => {
  try {
    const payments = await paymentService.getPaymentsByCustomerId(req.params.customerId);
    res.json(payments);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// POST /payments
export const create = async (req, res) => {
  try {
    const { invoice_id, customer_id, amount, payment_method, payment_status, processed_at } = req.body;
    if (!invoice_id || !customer_id || amount === undefined)
      return res.status(400).json({ error: "invoice_id, customer_id e amount são obrigatórios" });

    const payment = await paymentService.createPayment({ invoice_id, customer_id, amount, payment_method, payment_status, processed_at });
    res.status(201).json(payment);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// PUT /payments/:id
export const update = async (req, res) => {
  try {
    const { payment_method, payment_status, processed_at } = req.body;
    const affected = await paymentService.updatePayment(req.params.id, { payment_method, payment_status, processed_at });
    if (!affected) return res.status(404).json({ error: "Pagamento não encontrado" });
    res.json({ message: "Pagamento actualizado com sucesso" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// PATCH /payments/:id/process
export const process = async (req, res) => {
  try {
    const affected = await paymentService.processPayment(req.params.id);
    if (!affected) return res.status(404).json({ error: "Pagamento não encontrado" });
    res.json({ message: "Pagamento processado com sucesso" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// PATCH /payments/:id/fail
export const fail = async (req, res) => {
  try {
    const affected = await paymentService.failPayment(req.params.id);
    if (!affected) return res.status(404).json({ error: "Pagamento não encontrado" });
    res.json({ message: "Pagamento marcado como falhado" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// DELETE /payments/:id
export const remove = async (req, res) => {
  try {
    const affected = await paymentService.deletePayment(req.params.id);
    if (!affected) return res.status(404).json({ error: "Pagamento não encontrado" });
    res.json({ message: "Pagamento eliminado com sucesso" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
