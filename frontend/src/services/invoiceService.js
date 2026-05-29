import { api } from './api.js';

export const invoiceService = {
  getAll:      ()          => api.get('/invoices'),
  getById:     (id)        => api.get(`/invoices/${id}`),
  getByOrder:  (orderId)   => api.get(`/invoices/order/${orderId}`),
  create:      (data)      => api.post('/invoices', data),
  update:      (id, data)  => api.put(`/invoices/${id}`, data),
  remove:      (id)        => api.delete(`/invoices/${id}`),
};
