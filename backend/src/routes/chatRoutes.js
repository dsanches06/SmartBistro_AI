import express from "express";
import * as chatBotController from "../controllers/chatBotController.js";
import * as chatHistoryController from "../controllers/chatHistoryController.js";


const router = express.Router();

// POST /chat/message/stream — stream SSE principal
// Body: { message, conversationId?, user_id? }
router.post("/message/stream", chatBotController.sendMessageToBotStream);

// POST /chat/message — compatibilidade com rota legada (stream)
router.post("/message", chatBotController.sendMessageToBotStream);

// POST /chat/conversation/:conversationId/message — envia mensagem numa conversa específica (sem stream)
// Body: { message }
router.post("/conversation/:conversationId/message", chatBotController.sendMessageToConversation);

// Chat history CRUD unificado em /chat/history
router.get("/history", chatHistoryController.getAll);
router.get("/history/conversation/:conversationId", chatHistoryController.getByConversationId);
router.get("/history/:id", chatHistoryController.getById);
router.post("/history", chatHistoryController.create);
router.put("/history/:id", chatHistoryController.update);
router.delete("/history/:id", chatHistoryController.remove);

export default router;
