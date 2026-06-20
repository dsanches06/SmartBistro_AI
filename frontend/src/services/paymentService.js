import { api } from './api.js';

export const paymentService = {
  getAll:          ()           => api.get('/payments'),
  getById:         (id)         => api.get(`/payments/${id}`),
  getByInvoice:    (invoiceId)  => api.get(`/payments/invoice/${invoiceId}`),
  getByUser:       (userId)     => api.get(`/payments/user/${userId}`),
  create:          (data)       => api.post('/payments', data),
  update:          (id, data)   => api.put(`/payments/${id}`, data),
  process:         (id, data)   => api.patch(`/payments/${id}/process`, data),
  fail:            (id, data)   => api.patch(`/payments/${id}/fail`, data),
  remove:          (id)         => api.delete(`/payments/${id}`),
};
