import { api } from './api.js';

// Serviços de pedidos expostos ao restante frontend.
export const orderService = {
  getAll:           ()              => api.get('/orders'),
  getPending:       ()              => api.get('/orders/pending'),
  getById:          (id)            => api.get(`/orders/${id}`),
  getByUser:        (userId)        => api.get(`/orders/user/${userId}`),
  create:           (data)          => api.post('/orders', data),
  update:           (id, data)      => api.put(`/orders/${id}`, data),
  updateStatus:     (id, status)    => api.patch(`/orders/${id}/status`, { order_status: status }),
  remove:           (id)            => api.delete(`/orders/${id}`),
  runPipeline:      (data)          => api.post('/orders/pipeline', data),
  chefStart:        (id)            => api.post(`/orders/${id}/chef-start`),
  autoAdvance:      ()              => api.post('/orders/auto-advance', {}),
};
