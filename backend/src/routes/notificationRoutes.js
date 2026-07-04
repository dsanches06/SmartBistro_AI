import { Router } from "express";
import { notificationController } from "../controllers/index.js";
import { verifyToken } from "../middlewares/authMiddleware.js";

const router = Router();

// Não usado directamente pelo frontend (o sino de notificações usa /users/:id/notifications),
// mas fica acessível a qualquer utilizador autenticado por higiene.
router.use(verifyToken);

router.get("/", notificationController.getAll);
router.get("/user/:userId", notificationController.getByUserId);
router.get("/user/:userId/unread", notificationController.getUnread);
router.get("/:id", notificationController.getById);
router.post("/", notificationController.create);
router.put("/:id", notificationController.update);
router.patch("/:id/read", notificationController.markAsRead);
router.patch("/:id/read-status", notificationController.toggleReadStatus);
router.delete("/:id", notificationController.remove);

export default router;
