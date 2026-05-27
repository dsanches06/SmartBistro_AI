import { createOrder, createOrderFunctionDeclaration } from './create.js';
import { updateOrderStatus, updateOrderStatusFunctionDeclaration } from './update_status.js';

export { createOrder, createOrderFunctionDeclaration };
export { updateOrderStatus, updateOrderStatusFunctionDeclaration };

export const functionDeclarations = [
  createOrderFunctionDeclaration,
  updateOrderStatusFunctionDeclaration,
];
