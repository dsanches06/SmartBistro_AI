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
import { addPoints } from '../services/pointsService.js';
import { createNotification } from '../services/notificationService.js';
import { asyncHandler } from "../utils/index.js";

const PAYMENT_METHODS = ["MB Way", "Multibanco", "Credit Card", "Cash"];
const PAYMENT_STATUS_OPTIONS = ["Pending", "Completed", "Failed"];

// GET /payments?status=&paymentMethod=
export const getAll = asyncHandler(async (req, res) => {
  const { status, paymentMethod } = req.query;
  const payments = await getAllPayments(status, paymentMethod);
  res.json(payments);
});

// GET /payments/:id
export const getById = asyncHandler(async (req, res) => {
  const payment = await getPaymentById(req.params.id);
  if (!payment) return res.status(404).json({ error: "Pagamento não encontrado" });
  res.json(payment);
});

// GET /payments/invoice/:invoiceId
export const getByInvoiceId = asyncHandler(async (req, res) => {
  const payment = await getPaymentByInvoiceId(req.params.invoiceId);
  if (!payment) return res.status(404).json({ error: "Pagamento para essa fatura não encontrado" });
  res.json(payment);
});

// GET /payments/user/:userId
export const getByUserId = asyncHandler(async (req, res) => {
  res.json(await getPaymentsByCustomerId(req.params.userId));
});

// POST /payments
export const create = asyncHandler(async (req, res) => {
  try {
    const { invoice_id, user_id, amount, payment_method, payment_status } = req.body;
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
      user_id: user_id ?? null,
      amount,
      payment_method,
      payment_status,
      processed_at: payment_status === 'Completed' ? new Date() : null,
    });

    // Adiciona pontos e notifica o cliente quando o pagamento é concluído
    if (payment_status === 'Completed' && user_id) {
      const pts = Math.floor(Number(amount));
      addPoints(user_id, amount, invoice?.order_id)
        .then(() => {
          if (pts <= 0) return;
          createNotification({
            user_id,
            title: `+${pts} pontos adicionados!`,
            message: `Ganhaste ${pts} ponto${pts !== 1 ? 's' : ''} com a compra #${invoice?.order_id ?? '—'}. Consulta o teu saldo de pontos no perfil.`,
          }).catch(e => console.error('[Points Notif] Erro:', e.message));
        })
        .catch(err => console.error('[Points] Erro ao adicionar pontos:', err.message));
    }

    res.status(201).json(payment);
  } catch (err) {
    console.error('[Payment] Erro ao criar pagamento:', err.message, err.code ?? '');
    throw err;
  }
});

// PUT /payments/:id
export const update = asyncHandler(async (req, res) => {
  const { payment_method, payment_status, processed_at } = req.body;
  if (payment_method && !PAYMENT_METHODS.includes(payment_method))
    return res.status(400).json({ error: `payment_method inválido. Use: ${PAYMENT_METHODS.join(', ')}` });
  if (payment_status && !PAYMENT_STATUS_OPTIONS.includes(payment_status))
    return res.status(400).json({ error: `payment_status inválido. Use: ${PAYMENT_STATUS_OPTIONS.join(', ')}` });

  const affected = await updatePayment(req.params.id, { payment_method, payment_status, processed_at });
  if (!affected) return res.status(404).json({ error: "Pagamento não encontrado" });
  res.json({ message: "Pagamento actualizado com sucesso" });
});

// PATCH /payments/:id/process
export const process = asyncHandler(async (req, res) => {
  const affected = await processPayment(req.params.id);
  if (!affected) return res.status(404).json({ error: "Pagamento não encontrado" });
  res.json({ message: "Pagamento processado com sucesso" });
});

// PATCH /payments/:id/fail
export const fail = asyncHandler(async (req, res) => {
  const affected = await failPayment(req.params.id);
  if (!affected) return res.status(404).json({ error: "Pagamento não encontrado" });
  res.json({ message: "Pagamento marcado como falhado" });
});

// DELETE /payments/:id
export const remove = asyncHandler(async (req, res) => {
  const affected = await deletePayment(req.params.id);
  if (!affected) return res.status(404).json({ error: "Pagamento não encontrado" });
  res.json({ message: "Pagamento eliminado com sucesso" });
});
