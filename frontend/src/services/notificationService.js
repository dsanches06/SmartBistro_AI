import { api } from './api.js';

// Serviços para listar, criar e marcar notificações.
export const notificationService = {
  getAll:           ()            => api.get('/notifications'),
  getById:          (id)          => api.get(`/notifications/${id}`),
  getByUser:        (userId)      => api.get(`/notifications/user/${userId}`),
  getUnread:        (userId)      => api.get(`/notifications/user/${userId}/unread`),
  create:           (data)        => api.post('/notifications', data),
  update:           (id, data)    => api.put(`/notifications/${id}`, data),
  markAsRead:       (id)          => api.patch(`/notifications/${id}/read`),
  toggleReadStatus: (id)          => api.patch(`/notifications/${id}/read-status`),
  remove:           (id)          => api.delete(`/notifications/${id}`),
};
