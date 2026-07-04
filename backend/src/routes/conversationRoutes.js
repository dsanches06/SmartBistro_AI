import { Router } from "express";
import { conversationController } from "../controllers/index.js";
import { verifyToken, requireRole } from "../middlewares/authMiddleware.js";

const router = Router();

// GET "/" fica público — é usado pelo próprio widget de chat (incluindo visitantes
// anónimos) para listar o histórico de conversas (ChatUI.jsx → chatService.getConversations()).
router.get("/", conversationController.getAll);

router.get("/:id",     verifyToken, requireRole(1), conversationController.getById);
router.post("/",       verifyToken, requireRole(1), conversationController.create);
router.put("/:id",     verifyToken, requireRole(1), conversationController.update);
router.delete("/:id",  verifyToken, requireRole(1), conversationController.remove);

export default router;
