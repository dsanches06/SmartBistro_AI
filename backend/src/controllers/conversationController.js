import {
  getAllConversations,
  getConversationById,
  createConversation,
  updateConversation,
  deleteConversation,
} from "../services/index.js";

// GET /conversations
export const getAll = async (req, res) => {
  try {
    const conversations = await getAllConversations();
    res.json(conversations);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// GET /conversations/:id
export const getById = async (req, res) => {
  try {
    const conversation = await getConversationById(req.params.id);
    if (!conversation) return res.status(404).json({ error: "Conversa não encontrada" });
    res.json(conversation);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// POST /conversations
export const create = async (req, res) => {
  try {
    const { customer_id, title } = req.body;
    if (!title) return res.status(400).json({ error: "title é obrigatório" });

    const conversation = await createConversation({ customer_id, title });
    res.status(201).json(conversation);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// PUT /conversations/:id
export const update = async (req, res) => {
  try {
    const { title } = req.body;
    if (!title) return res.status(400).json({ error: "title é obrigatório" });

    const affected = await updateConversation(req.params.id, { title });
    if (!affected) return res.status(404).json({ error: "Conversa não encontrada" });
    res.json({ message: "Conversa actualizada com sucesso" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// DELETE /conversations/:id
export const remove = async (req, res) => {
  try {
    const affected = await deleteConversation(req.params.id);
    if (!affected) return res.status(404).json({ error: "Conversa não encontrada" });
    res.json({ message: "Conversa eliminada com sucesso" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
