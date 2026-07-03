import { api } from './api.js';

// Serviço para consultar fichas técnicas (ingredientes necessários por item do menu).
export const recipeItemService = {
  getAll:        ()         => api.get('/recipe-items'),
  getByItemId:   (itemId)   => api.get(`/recipe-items/item/${itemId}`),
};
