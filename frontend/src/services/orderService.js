import { api } from './api.js';

export const orderService = {
  getAll:           ()              => api.get('/orders'),
  getPending:       ()              => api.get('/orders/pending'),
  getById:          (id)            => api.get(`/orders/${id}`),
  getByCustomer:    (customerId)    => api.get(`/orders/customer/${customerId}`),
  create:           (data)          => api.post('/orders', data),
  update:           (id, data)      => api.put(`/orders/${id}`, data),
  updateStatus:     (id, status)    => api.patch(`/orders/${id}/status`, { order_status: status }),
  remove:           (id)            => api.delete(`/orders/${id}`),
  runPipeline:      (data)          => api.post('/orders/pipeline', data),
};
