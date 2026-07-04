import { Router } from "express";
import { chatHistoryController } from "../controllers/index.js";
import { verifyToken, requireRole } from "../middlewares/authMiddleware.js";

const router = Router();

// CRUD de histórico de chat — não usado pelo frontend (chatbot grava via service layer), só para staff.
router.use(verifyToken, requireRole(1));

router.get("/", chatHistoryController.getAll);
router.get("/conversation/:conversationId", chatHistoryController.getByConversationId);
router.get("/:id", chatHistoryController.getById);
router.post("/", chatHistoryController.create);
router.put("/:id", chatHistoryController.update);
router.delete("/:id", chatHistoryController.remove);

export default router;
