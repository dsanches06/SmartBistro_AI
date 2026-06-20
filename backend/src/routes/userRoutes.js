import { Router } from "express";
import * as userController from "../controllers/userController.js";
import * as notificationController from "../controllers/notificationController.js";
import { getUserById } from "../services/userService.js";
import { createExistsMiddleware } from "../middlewares/createExistsMiddleware.js";

const router = Router();
const checkUserExists = createExistsMiddleware(getUserById, "Utilizador", "user");

router.get("/",  userController.getAll);
router.post("/", userController.create);

// Rotas com :id
router.get("/:id",          checkUserExists, userController.getById);
router.put("/:id",          checkUserExists, userController.update);
router.delete("/:id",       checkUserExists, userController.remove);
router.patch("/:id/active", checkUserExists, userController.toggleActive);

// Notificações aninhadas sob /users/:id/
router.get("/:id/notifications/unread", (req, res) => {
  req.params.userId = req.params.id;
  return notificationController.getUnread(req, res);
});
router.get("/:id/notifications", (req, res) => {
  req.params.userId = req.params.id;
  return notificationController.getByUserId(req, res);
});
router.patch("/:id/notifications/:notificationId", (req, res) => {
  req.params.id = req.params.notificationId;
  return notificationController.markAsRead(req, res);
});

export default router;
