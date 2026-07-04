import { Router } from "express";
import * as userController from "../controllers/userController.js";
import * as notificationController from "../controllers/notificationController.js";
import { getUserById } from "../services/userService.js";
import { createExistsMiddleware } from "../middlewares/createExistsMiddleware.js";
import { verifyToken, requireRole } from "../middlewares/authMiddleware.js";

const router = Router();
const checkUserExists = createExistsMiddleware(getUserById, "Utilizador", "user");
const staffOnly = [verifyToken, requireRole(1)];

// Gestão de clientes (ClientesPage) — exclusiva de staff.
router.get("/",  ...staffOnly, userController.getAll);
router.post("/", ...staffOnly, userController.create);

// Rotas com :id
router.get("/:id",          checkUserExists, ...staffOnly, userController.getById);
router.put("/:id",          checkUserExists, ...staffOnly, userController.update);
router.delete("/:id",       checkUserExists, ...staffOnly, userController.remove);
router.patch("/:id/active", checkUserExists, ...staffOnly, userController.toggleActive);

// Notificações aninhadas sob /users/:id/ — usadas pelo sino de notificações (Header.jsx)
// tanto por clientes como por staff, por isso só exigem sessão iniciada (não staff-only).
router.get("/:id/notifications/unread", verifyToken, (req, res) => {
  req.params.userId = req.params.id;
  return notificationController.getUnread(req, res);
});
router.get("/:id/notifications", verifyToken, (req, res) => {
  req.params.userId = req.params.id;
  return notificationController.getByUserId(req, res);
});
router.patch("/:id/notifications/:notificationId", verifyToken, (req, res) => {
  req.params.id = req.params.notificationId;
  return notificationController.markAsRead(req, res);
});

export default router;
