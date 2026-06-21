import { api } from './api.js';

// Serviços CRUD para faturas geradas a partir de pedidos.
export const invoiceService = {
  // Devolve todas as faturas.
  getAll:      ()          => api.get('/invoices'),
  // Devolve uma fatura pelo seu id.
  getById:     (id)        => api.get(`/invoices/${id}`),
  // Devolve a fatura associada a um pedido específico.
  getByOrder:  (orderId)   => api.get(`/invoices/order/${orderId}`),
  // Cria uma nova fatura (subtotal, imposto, total).
  create:      (data)      => api.post('/invoices', data),
  // Atualiza valores de uma fatura existente.
  update:      (id, data)  => api.put(`/invoices/${id}`, data),
  // Remove uma fatura pelo id.
  remove:      (id)        => api.delete(`/invoices/${id}`),
};
