import { createExistsMiddleware } from "./createExistsMiddleware.js";
import {
  getCustomerById,
  getUserById,
  getOrderById,
  getTableById,
  getItemById,
  getIngredientById,
  getStockById,
  getOrderItemById,
  getInvoiceById,
  getPaymentById,
  getReservationById,
  getNotificationById,
} from "../services/index.js";

export const checkCustomerExists    = createExistsMiddleware(getCustomerById,    "Cliente",        "customer");
export const checkUserExists        = createExistsMiddleware(getUserById,        "Utilizador",     "user");
export const checkOrderExists       = createExistsMiddleware(getOrderById,       "Pedido",         "order");
export const checkTableExists       = createExistsMiddleware(getTableById,       "Mesa",           "table");
export const checkItemExists        = createExistsMiddleware(getItemById,        "Item",           "item");
export const checkIngredientExists  = createExistsMiddleware(getIngredientById,  "Ingrediente",    "ingredient");
export const checkStockExists       = createExistsMiddleware(getStockById,       "Stock",          "stock");
export const checkOrderItemExists   = createExistsMiddleware(getOrderItemById,   "Item de pedido", "orderItem");
export const checkInvoiceExists     = createExistsMiddleware(getInvoiceById,     "Fatura",         "invoice");
export const checkPaymentExists     = createExistsMiddleware(getPaymentById,     "Pagamento",      "payment");
export const checkReservationExists = createExistsMiddleware(getReservationById, "Reserva",        "reservation");
export const checkNotificationExists= createExistsMiddleware(getNotificationById,"Notificação",    "notification");
