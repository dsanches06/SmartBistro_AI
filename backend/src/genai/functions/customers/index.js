import { createCustomer, createCustomerFunctionDeclaration } from './create.js';
import { getCustomer, getCustomerFunctionDeclaration } from './get.js';

export { createCustomer, createCustomerFunctionDeclaration };
export { getCustomer, getCustomerFunctionDeclaration };

export const functionDeclarations = [
  createCustomerFunctionDeclaration,
  getCustomerFunctionDeclaration,
];
