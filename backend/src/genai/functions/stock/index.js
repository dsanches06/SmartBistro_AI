import { getStock, getStockFunctionDeclaration } from './get.js';
import { adjustStock, adjustStockFunctionDeclaration } from './adjust.js';

export { getStock, getStockFunctionDeclaration };
export { adjustStock, adjustStockFunctionDeclaration };

export const functionDeclarations = [
  getStockFunctionDeclaration,
  adjustStockFunctionDeclaration,
];
