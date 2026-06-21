import { api } from './api.js';

// Serviços CRUD para itens do menu.
export const itemService = {
  // Devolve todos os itens (ativos e inativos).
  getAll:        ()           => api.get('/items'),
  // Devolve apenas os itens com is_active = true (usado no cardápio público).
  getActive:     ()           => api.get('/items/active'),
  // Devolve um item pelo seu id.
  getById:       (id)         => api.get(`/items/${id}`),
  // Cria um novo item no menu.
  create:        (data)       => api.post('/items', data),
  // Atualiza nome, categoria ou preço de um item existente.
  update:        (id, data)   => api.put(`/items/${id}`, data),
  // Ativa ou desativa um item sem o eliminar.
  toggleActive:  (id, active) => api.patch(`/items/${id}/active`, { is_active: active }),
  // Remove permanentemente um item do menu.
  remove:        (id)         => api.delete(`/items/${id}`),
};
