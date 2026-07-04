import express from "express";
import { chatBotController, chatHistoryController } from "../controllers/index.js";
import { verifyToken, requireRole } from "../middlewares/authMiddleware.js";


const router = express.Router();

// POST /chat/message/stream — stream SSE principal
// Body: { message, conversationId?, user_id? }
// Público — suporta clientes anónimos (sem conta), identificados por customer_name.
router.post("/message/stream", chatBotController.sendMessageToBotStream);

// POST /chat/message — compatibilidade com rota legada (stream)
router.post("/message", chatBotController.sendMessageToBotStream);

// POST /chat/conversation/:conversationId/message — envia mensagem numa conversa específica (sem stream)
// Body: { message }
router.post("/conversation/:conversationId/message", chatBotController.sendMessageToConversation);

// Chat history CRUD unificado em /chat/history.
// getByConversationId fica público — é usado pelo próprio widget de chat (incluindo
// visitantes anónimos) para recarregar o histórico de uma conversa (ChatUI.jsx).
router.get("/history/conversation/:conversationId",   chatHistoryController.getByConversationId);
router.get("/history",                                verifyToken, requireRole(1), chatHistoryController.getAll);
router.get("/history/:id",                            verifyToken, requireRole(1), chatHistoryController.getById);
router.post("/history",                               verifyToken, requireRole(1), chatHistoryController.create);
router.put("/history/:id",                            verifyToken, requireRole(1), chatHistoryController.update);
router.delete("/history/:id",                         verifyToken, requireRole(1), chatHistoryController.remove);

export default router;
