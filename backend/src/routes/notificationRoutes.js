import { Router } from "express";
import * as notificationController from "../controllers/notificationController.js";

const router = Router();

router.get("/", notificationController.getAll);
router.get("/customer/:customerId", notificationController.getByCustomerId);
router.get("/customer/:customerId/unread", notificationController.getUnread);
router.get("/:id", notificationController.getById);
router.post("/", notificationController.create);
router.put("/:id", notificationController.update);
router.patch("/:id/read", notificationController.markAsRead);
router.patch("/:id/read-status", notificationController.toggleReadStatus);
router.delete("/:id", notificationController.remove);

export default router;
