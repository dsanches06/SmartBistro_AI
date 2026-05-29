import { api } from './api.js';

export const orderItemService = {
  getAll:          ()            => api.get('/order-items'),
  getById:         (id)          => api.get(`/order-items/${id}`),
  getByOrder:      (orderId)     => api.get(`/order-items/order/${orderId}`),
  create:          (data)        => api.post('/order-items', data),
  createBulk:      (items)       => api.post('/order-items/bulk', items),
  updateQuantity:  (id, data)    => api.patch(`/order-items/${id}`, data),
  remove:          (id)          => api.delete(`/order-items/${id}`),
  removeByOrder:   (orderId)     => api.delete(`/order-items/order/${orderId}`),
};
