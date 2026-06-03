import { Router } from "express";
import { customerController, notificationController } from "../controllers/index.js";
import { checkCustomerExists } from "../middlewares/index.js";

const router = Router();

router.get("/",       customerController.getAll);
router.post("/",      customerController.create);

// Rotas com :id — middleware valida a existência antes de chegar ao controller
router.get("/:id",           checkCustomerExists, customerController.getById);
router.put("/:id",           checkCustomerExists, customerController.update);
router.delete("/:id",        checkCustomerExists, customerController.remove);

// Rotas de notificações aninhadas — mais específicas antes da geral
router.get("/:id/notifications/unread", (req, res) => {
  req.params.customerId = req.params.id;
  return notificationController.getUnread(req, res);
});
router.get("/:id/notifications", (req, res) => {
  req.params.customerId = req.params.id;
  return notificationController.getByCustomerId(req, res);
});
router.patch("/:id/notifications/:notificationId", (req, res) => {
  req.params.id = req.params.notificationId;
  return notificationController.markAsRead(req, res);
});

export default router;
