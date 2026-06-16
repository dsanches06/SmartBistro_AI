import { api } from './api.js';

// Serviços de gestão de clientes e notificações.
export const customerService = {
  getAll:               ()                      => api.get('/customers'),
  getById:              (id)                    => api.get(`/customers/${id}`),
  create:               (data)                  => api.post('/customers', data),
  update:               (id, data)              => api.put(`/customers/${id}`, data),
  toggleActive:         (id, active)             => api.patch(`/customers/${id}/active`, { active }),
  remove:               (id)                    => api.delete(`/customers/${id}`),
  getNotifications:     (id)                    => api.get(`/customers/${id}/notifications`),
  getUnreadNotifications: (id)                  => api.get(`/customers/${id}/notifications/unread`),
  markNotificationRead: (id, notificationId)    => api.patch(`/customers/${id}/notifications/${notificationId}`),
};
