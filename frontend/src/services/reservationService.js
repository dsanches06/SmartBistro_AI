import { api } from './api.js';

export const reservationService = {
  getAll:         ()             => api.get('/reservations'),
  getById:        (id)           => api.get(`/reservations/${id}`),
  getByUser:      (userId)       => api.get(`/reservations/user/${userId}`),
  create:         (data)         => api.post('/reservations', data),
  updateStatus:   (id, status)   => api.patch(`/reservations/${id}/status`, { status }),
  confirm:        (id)           => api.patch(`/reservations/${id}/status`, { status: 'Confirmed' }),
  cancel:         (id)           => api.patch(`/reservations/${id}/cancel`),
  remove:         (id)           => api.delete(`/reservations/${id}`),
};
