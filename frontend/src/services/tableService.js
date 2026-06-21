import { api } from './api.js';

// Serviços CRUD para mesas e reservas do restaurante.
export const tableService = {
  // Devolve todas as mesas com o estado atual.
  getAll:       ()             => api.get('/tables'),
  // Devolve uma mesa pelo seu id.
  getById:      (id)           => api.get(`/tables/${id}`),
  // Devolve detalhes completos de uma mesa (pedidos, ocupantes, etc.).
  getDetailsById:     (id)     => api.get(`/tables/${id}/details`),
  // Devolve a reserva ativa associada a uma mesa.
  getReservationById: (id)     => api.get(`/tables/${id}/reservation`),
  // Cria uma nova mesa.
  create:       (data)         => api.post('/tables', data),
  // Atualiza dados de uma mesa (nome, capacidade, etc.).
  update:       (id, data)     => api.put(`/tables/${id}`, data),
  // Muda o estado de uma mesa (disponível, ocupada, reservada).
  updateStatus: (id, status)   => api.patch(`/tables/${id}/status`, { status }),
  // Remove permanentemente uma mesa.
  remove:       (id)           => api.delete(`/tables/${id}`),
};
