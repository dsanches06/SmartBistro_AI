import { createPayment, createPaymentFunctionDeclaration } from './create.js';
import { updatePaymentStatus, updatePaymentStatusFunctionDeclaration } from './update_status.js';

export { createPayment, createPaymentFunctionDeclaration };
export { updatePaymentStatus, updatePaymentStatusFunctionDeclaration };

export const functionDeclarations = [
  createPaymentFunctionDeclaration,
  updatePaymentStatusFunctionDeclaration,
];
