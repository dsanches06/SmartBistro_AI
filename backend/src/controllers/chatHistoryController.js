import {
  getAllChatHistory,
  getChatHistoryById,
  getChatHistoryByConversationId,
  createChatHistory,
  updateChatHistory,
  deleteChatHistory,
} from "../services/index.js";
import { asyncHandler } from "../utils/index.js";

// GET /chat-history
export const getAll = asyncHandler(async (req, res) => {
  const history = await getAllChatHistory();
  res.json(history);
});

// GET /chat-history/:id
export const getById = asyncHandler(async (req, res) => {
  const message = await getChatHistoryById(req.params.id);
  if (!message) return res.status(404).json({ error: "Mensagem não encontrada" });
  res.json(message);
});

// GET /chat-history/conversation/:conversationId
export const getByConversationId = asyncHandler(async (req, res) => {
  const history = await getChatHistoryByConversationId(req.params.conversationId);
  res.json(history);
});

// POST /chat-history
export const create = asyncHandler(async (req, res) => {
  const { conversation_id, role_id, content } = req.body;
  if (!conversation_id || !role_id || !content)
    return res.status(400).json({ error: "conversation_id, role_id e content são obrigatórios" });

  const message = await createChatHistory({ conversation_id, role_id, content });
  res.status(201).json(message);
});

// PUT /chat-history/:id
export const update = asyncHandler(async (req, res) => {
  const { content } = req.body;
  if (!content) return res.status(400).json({ error: "content é obrigatório" });

  const affected = await updateChatHistory(req.params.id, { content });
  if (!affected) return res.status(404).json({ error: "Mensagem não encontrada" });
  res.json({ message: "Mensagem actualizada com sucesso" });
});

// DELETE /chat-history/:id
export const remove = asyncHandler(async (req, res) => {
  const affected = await deleteChatHistory(req.params.id);
  if (!affected) return res.status(404).json({ error: "Mensagem não encontrada" });
  res.json({ message: "Mensagem eliminada com sucesso" });
});
