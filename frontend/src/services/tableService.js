import { api } from './api.js';

export const tableService = {
  getAll:       ()             => api.get('/tables'),
  getById:      (id)           => api.get(`/tables/${id}`),
  getDetailsById:     (id)     => api.get(`/tables/${id}/details`),
  getReservationById: (id)     => api.get(`/tables/${id}/reservation`),
  create:       (data)         => api.post('/tables', data),
  update:       (id, data)     => api.put(`/tables/${id}`, data),
  updateStatus: (id, status)   => api.patch(`/tables/${id}/status`, { status }),
  remove:       (id)           => api.delete(`/tables/${id}`),
};
