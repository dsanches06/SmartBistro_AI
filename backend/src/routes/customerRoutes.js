import { Router } from "express";
import { customerController, notificationController } from "../controllers/index.js";

const router = Router();

router.get("/", customerController.getAll);
router.get("/:id", customerController.getById);
router.post("/", customerController.create);
router.put("/:id", customerController.update);
router.delete("/:id", customerController.remove);
router.patch("/:id/active", customerController.toggleActive);

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
