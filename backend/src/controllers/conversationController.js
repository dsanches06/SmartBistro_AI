import {
  getAllConversations,
  getConversationById,
  createConversation,
  updateConversation,
  deleteConversation,
} from "../services/index.js";
import { asyncHandler } from "../utils/index.js";

// GET /conversations
export const getAll = asyncHandler(async (req, res) => {
  const conversations = await getAllConversations();
  res.json(conversations);
});

// GET /conversations/:id
export const getById = asyncHandler(async (req, res) => {
  const conversation = await getConversationById(req.params.id);
  if (!conversation) return res.status(404).json({ error: "Conversa não encontrada" });
  res.json(conversation);
});

// POST /conversations
export const create = asyncHandler(async (req, res) => {
  const { user_id, title } = req.body;
  if (!title) return res.status(400).json({ error: "title é obrigatório" });

  const conversation = await createConversation({ user_id, title });
  res.status(201).json(conversation);
});

// PUT /conversations/:id
export const update = asyncHandler(async (req, res) => {
  const { title } = req.body;
  if (!title) return res.status(400).json({ error: "title é obrigatório" });

  const affected = await updateConversation(req.params.id, { title });
  if (!affected) return res.status(404).json({ error: "Conversa não encontrada" });
  res.json({ message: "Conversa actualizada com sucesso" });
});

// DELETE /conversations/:id
export const remove = asyncHandler(async (req, res) => {
  const affected = await deleteConversation(req.params.id);
  if (!affected) return res.status(404).json({ error: "Conversa não encontrada" });
  res.json({ message: "Conversa eliminada com sucesso" });
});
