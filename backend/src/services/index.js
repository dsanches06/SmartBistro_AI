export * from "./customerService.js";
export { getById as getCustomerById } from "./customerService.js";
// User e Staff (phoneExists omitido do index para evitar conflito com customerService)
export {
  getAllUsers, getUserById, createUser, findOrCreateUser,
  updateUser, toggleUserActive, emailExists, deleteUser,
} from "./userService.js";
export * from "./staffService.js";
export * from "./roleService.js";
export * from "./tableService.js";
export * from "./itemService.js";
export * from "./ingredientService.js";
export * from "./stockService.js";
export * from "./recipeItemService.js";
export * from "./orderService.js";
export * from "./orderItemService.js";
export * from "./invoiceService.js";
export * from "./paymentService.js";
export * from "./notificationService.js";
export * from "./conversationService.js";
export * from "./chatHistoryService.js";
export * from "./logService.js";
export * from "./reservationService.js";
