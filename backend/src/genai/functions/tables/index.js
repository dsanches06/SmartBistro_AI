import { getTable, getTableFunctionDeclaration } from './get.js';
import { updateTableStatus, updateTableStatusFunctionDeclaration } from './update_status.js';

export { getTable, getTableFunctionDeclaration };
export { updateTableStatus, updateTableStatusFunctionDeclaration };

export const functionDeclarations = [
  getTableFunctionDeclaration,
  updateTableStatusFunctionDeclaration,
];
