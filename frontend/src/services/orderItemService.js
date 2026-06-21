import { api } from './api.js';

// Serviços para linhas de pedido (itens individuais dentro de um pedido).
export const orderItemService = {
  // Devolve todos os itens de pedido.
  getAll:          ()            => api.get('/order-items'),
  // Devolve um item de pedido pelo seu id.
  getById:         (id)          => api.get(`/order-items/${id}`),
  // Devolve todos os itens associados a um pedido.
  getByOrder:      (orderId)     => api.get(`/order-items/order/${orderId}`),
  // Cria um único item de pedido.
  create:          (data)        => api.post('/order-items', data),
  // Cria múltiplos itens de pedido de uma só vez (bulk insert).
  createBulk:      (items)       => api.post('/order-items/bulk', items),
  // Atualiza a quantidade de um item de pedido.
  updateQuantity:  (id, data)    => api.patch(`/order-items/${id}`, data),
  // Remove um item de pedido pelo id.
  remove:          (id)          => api.delete(`/order-items/${id}`),
  // Remove todos os itens de um pedido (usado ao cancelar).
  removeByOrder:   (orderId)     => api.delete(`/order-items/order/${orderId}`),
};
