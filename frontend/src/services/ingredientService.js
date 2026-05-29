import { api } from './api.js';

export const ingredientService = {
  getAll:   ()           => api.get('/ingredients'),
  getById:  (id)         => api.get(`/ingredients/${id}`),
  create:   (data)       => api.post('/ingredients', data),
  update:   (id, data)   => api.put(`/ingredients/${id}`, data),
  remove:   (id)         => api.delete(`/ingredients/${id}`),
};
