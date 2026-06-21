import { api } from './api.js';

// Serviços para registo e processamento de pagamentos.
export const paymentService = {
  // Devolve todos os pagamentos.
  getAll:          ()           => api.get('/payments'),
  // Devolve um pagamento pelo seu id.
  getById:         (id)         => api.get(`/payments/${id}`),
  // Devolve o pagamento associado a uma fatura.
  getByInvoice:    (invoiceId)  => api.get(`/payments/invoice/${invoiceId}`),
  // Devolve os pagamentos de um utilizador específico.
  getByUser:       (userId)     => api.get(`/payments/user/${userId}`),
  // Cria um novo registo de pagamento.
  create:          (data)       => api.post('/payments', data),
  // Atualiza dados de um pagamento existente.
  update:          (id, data)   => api.put(`/payments/${id}`, data),
  // Marca um pagamento como processado (Completed).
  process:         (id, data)   => api.patch(`/payments/${id}/process`, data),
  // Marca um pagamento como falhado (Failed).
  fail:            (id, data)   => api.patch(`/payments/${id}/fail`, data),
  // Remove um pagamento pelo id.
  remove:          (id)         => api.delete(`/payments/${id}`),
};
