import { api } from './api.js';

// Serviços para consultar e ajustar o stock do restaurante.
export const stockService = {
  getAll:           ()                        => api.get('/stock'),
  getById:          (id)                      => api.get(`/stock/${id}`),
  getByIngredient:  (ingredientId)            => api.get(`/stock/ingredient/${ingredientId}`),
  create:           (data)                    => api.post('/stock', data),
  update:           (id, data)                => api.put(`/stock/${id}`, data),
  adjustQuantity:   (ingredientId, data)      => api.patch(`/stock/ingredient/${ingredientId}/adjust`, data),
  remove:           (id)                      => api.delete(`/stock/${id}`),
};
