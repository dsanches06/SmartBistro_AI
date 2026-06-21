// User e Staff (phoneExists exportado directamente — sem conflitos)
export {
  getAllUsers, getUserById, createUser, findOrCreateUser,
  updateUser, toggleUserActive, phoneExists, emailExists, deleteUser,
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
export * from "./recommendationService.js";
