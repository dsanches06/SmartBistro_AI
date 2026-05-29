import { api } from './api.js';

export const customerService = {
  getAll:               ()                      => api.get('/customers'),
  getById:              (id)                    => api.get(`/customers/${id}`),
  create:               (data)                  => api.post('/customers', data),
  update:               (id, data)              => api.put(`/customers/${id}`, data),
  toggleActive:         (id)                    => api.patch(`/customers/${id}/active`),
  remove:               (id)                    => api.delete(`/customers/${id}`),
  getNotifications:     (id)                    => api.get(`/customers/${id}/notifications`),
  getUnreadNotifications: (id)                  => api.get(`/customers/${id}/notifications/unread`),
  markNotificationRead: (id, notificationId)    => api.patch(`/customers/${id}/notifications/${notificationId}`),
};
