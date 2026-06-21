import { api } from './api.js';

// Serviços de pedidos expostos ao restante frontend.
export const orderService = {
  // Devolve todos os pedidos.
  getAll:           ()              => api.get('/orders'),
  // Devolve apenas pedidos com estado Pending.
  getPending:       ()              => api.get('/orders/pending'),
  // Devolve um pedido pelo seu id.
  getById:          (id)            => api.get(`/orders/${id}`),
  // Devolve os pedidos de um utilizador específico.
  getByUser:        (userId)        => api.get(`/orders/user/${userId}`),
  // Cria um novo pedido.
  create:           (data)          => api.post('/orders', data),
  // Atualiza dados gerais de um pedido.
  update:           (id, data)      => api.put(`/orders/${id}`, data),
  // Muda o estado de um pedido (Pending → InPreparation → Ready → Delivered).
  updateStatus:     (id, status)    => api.patch(`/orders/${id}/status`, { order_status: status }),
  // Remove um pedido pelo id.
  remove:           (id)            => api.delete(`/orders/${id}`),
  // Executa o pipeline de processamento de um pedido (stock + KDS).
  runPipeline:      (data)          => api.post('/orders/pipeline', data),
  // Inicia o processamento Chef AI para um pedido específico.
  chefStart:        (id)            => api.post(`/orders/${id}/chef-start`),
  // Avança automaticamente pedidos que tenham ficado parados na pipeline.
  autoAdvance:      ()              => api.post('/orders/auto-advance', {}),
};
