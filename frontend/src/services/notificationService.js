import { api } from './api.js';

export const notificationService = {
  getAll:           ()            => api.get('/notifications'),
  getById:          (id)          => api.get(`/notifications/${id}`),
  getByCustomer:    (customerId)  => api.get(`/notifications/customer/${customerId}`),
  getUnread:        (customerId)  => api.get(`/notifications/customer/${customerId}/unread`),
  create:           (data)        => api.post('/notifications', data),
  update:           (id, data)    => api.put(`/notifications/${id}`, data),
  markAsRead:       (id)          => api.patch(`/notifications/${id}/read`),
  toggleReadStatus: (id)          => api.patch(`/notifications/${id}/read-status`),
  remove:           (id)          => api.delete(`/notifications/${id}`),
};
