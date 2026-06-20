import { api } from './api.js';

// Serviços de gestão de utilizadores e notificações.
export const userService = {
  getAll:                 (search, sort)       => api.get('/users', { params: { search, sort } }),
  getById:                (id)                 => api.get(`/users/${id}`),
  create:                 (data)               => api.post('/users', data),
  update:                 (id, data)           => api.put(`/users/${id}`, data),
  toggleActive:           (id, active)         => api.patch(`/users/${id}/active`, { active }),
  remove:                 (id)                 => api.delete(`/users/${id}`),
  getNotifications:       (id)                 => api.get(`/users/${id}/notifications`),
  getUnreadNotifications: (id)                 => api.get(`/users/${id}/notifications/unread`),
  markNotificationRead:   (id, notificationId) => api.patch(`/users/${id}/notifications/${notificationId}`),
};
