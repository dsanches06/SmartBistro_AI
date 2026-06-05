import {
  getAllPayments,
  getPaymentById,
  getPaymentByInvoiceId,
  getPaymentsByCustomerId,
  createPayment,
  updatePayment,
  processPayment,
  failPayment,
  deletePayment,
  getInvoiceById,
} from "../services/index.js";

const PAYMENT_METHODS = ["MB Way", "Multibanco", "Credit Card", "Cash"];
const PAYMENT_STATUS_OPTIONS = ["Pending", "Completed", "Failed"];

// GET /payments?status=&paymentMethod=
export const getAll = async (req, res) => {
  try {
    const { status, paymentMethod } = req.query;
    const payments = await getAllPayments(status, paymentMethod);
    res.json(payments);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// GET /payments/:id
export const getById = async (req, res) => {
  try {
    const payment = await getPaymentById(req.params.id);
    if (!payment) return res.status(404).json({ error: "Pagamento não encontrado" });
    res.json(payment);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// GET /payments/invoice/:invoiceId
export const getByInvoiceId = async (req, res) => {
  try {
    const payment = await getPaymentByInvoiceId(req.params.invoiceId);
    if (!payment) return res.status(404).json({ error: "Pagamento para essa fatura não encontrado" });
    res.json(payment);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// GET /payments/customer/:customerId
export const getByCustomerId = async (req, res) => {
  try {
    res.json(await getPaymentsByCustomerId(req.params.customerId));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// POST /payments
export const create = async (req, res) => {
  try {
    const { invoice_id, customer_id, amount, payment_method, payment_status } = req.body;
    if (!invoice_id || amount === undefined)
      return res.status(400).json({ error: "invoice_id e amount são obrigatórios" });

    const invoice = await getInvoiceById(invoice_id);
    if (!invoice) return res.status(404).json({ error: "Fatura não encontrada" });

    // Verificar pagamento duplicado (invoice_id é UNIQUE na DB)
    const existing = await getPaymentByInvoiceId(invoice_id);
    if (existing) return res.status(409).json({ error: "Já existe um pagamento para esta fatura." });

    if (payment_method && !PAYMENT_METHODS.includes(payment_method))
      return res.status(400).json({ error: `payment_method inválido. Use: ${PAYMENT_METHODS.join(', ')}` });
    if (payment_status && !PAYMENT_STATUS_OPTIONS.includes(payment_status))
      return res.status(400).json({ error: `payment_status inválido. Use: ${PAYMENT_STATUS_OPTIONS.join(', ')}` });

    const payment = await createPayment({
      invoice_id,
      customer_id: customer_id ?? null,
      amount,
      payment_method,
      payment_status,
      processed_at: payment_status === 'Completed' ? new Date() : null,
    });
    res.status(201).json(payment);
  } catch (err) {
    console.error('[Payment] Erro ao criar pagamento:', err.message, err.code ?? '');
    res.status(500).json({ error: err.message });
  }
};

// PUT /payments/:id
export const update = async (req, res) => {
  try {
    const { payment_method, payment_status, processed_at } = req.body;
    if (payment_method && !PAYMENT_METHODS.includes(payment_method))
      return res.status(400).json({ error: `payment_method inválido. Use: ${PAYMENT_METHODS.join(', ')}` });
    if (payment_status && !PAYMENT_STATUS_OPTIONS.includes(payment_status))
      return res.status(400).json({ error: `payment_status inválido. Use: ${PAYMENT_STATUS_OPTIONS.join(', ')}` });

    const affected = await updatePayment(req.params.id, { payment_method, payment_status, processed_at });
    if (!affected) return res.status(404).json({ error: "Pagamento não encontrado" });
    res.json({ message: "Pagamento actualizado com sucesso" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// PATCH /payments/:id/process
export const process = async (req, res) => {
  try {
    const affected = await processPayment(req.params.id);
    if (!affected) return res.status(404).json({ error: "Pagamento não encontrado" });
    res.json({ message: "Pagamento processado com sucesso" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// PATCH /payments/:id/fail
export const fail = async (req, res) => {
  try {
    const affected = await failPayment(req.params.id);
    if (!affected) return res.status(404).json({ error: "Pagamento não encontrado" });
    res.json({ message: "Pagamento marcado como falhado" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// DELETE /payments/:id
export const remove = async (req, res) => {
  try {
    const affected = await deletePayment(req.params.id);
    if (!affected) return res.status(404).json({ error: "Pagamento não encontrado" });
    res.json({ message: "Pagamento eliminado com sucesso" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
