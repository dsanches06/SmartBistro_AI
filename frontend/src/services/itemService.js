import { api } from './api.js';

export const itemService = {
  getAll:        ()           => api.get('/items'),
  getActive:     ()           => api.get('/items/active'),
  getById:       (id)         => api.get(`/items/${id}`),
  create:        (data)       => api.post('/items', data),
  update:        (id, data)   => api.put(`/items/${id}`, data),
  toggleActive:  (id, active) => api.patch(`/items/${id}/active`, { is_active: active }),
  remove:        (id)         => api.delete(`/items/${id}`),
};
