import * as chatHistoryService from "../services/chatHistoryService.js";

// GET /chat-history
export const getAll = async (req, res) => {
  try {
    const history = await chatHistoryService.getAllChatHistory();
    res.json(history);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// GET /chat-history/:id
export const getById = async (req, res) => {
  try {
    const message = await chatHistoryService.getChatHistoryById(req.params.id);
    if (!message) return res.status(404).json({ error: "Mensagem não encontrada" });
    res.json(message);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// GET /chat-history/conversation/:conversationId
export const getByConversationId = async (req, res) => {
  try {
    const history = await chatHistoryService.getChatHistoryByConversationId(req.params.conversationId);
    res.json(history);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// POST /chat-history
export const create = async (req, res) => {
  try {
    const { conversation_id, role_id, content } = req.body;
    if (!conversation_id || !role_id || !content)
      return res.status(400).json({ error: "conversation_id, role_id e content são obrigatórios" });

    const message = await chatHistoryService.createChatHistory({ conversation_id, role_id, content });
    res.status(201).json(message);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// PUT /chat-history/:id
export const update = async (req, res) => {
  try {
    const { content } = req.body;
    if (!content) return res.status(400).json({ error: "content é obrigatório" });

    const affected = await chatHistoryService.updateChatHistory(req.params.id, { content });
    if (!affected) return res.status(404).json({ error: "Mensagem não encontrada" });
    res.json({ message: "Mensagem actualizada com sucesso" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// DELETE /chat-history/:id
export const remove = async (req, res) => {
  try {
    const affected = await chatHistoryService.deleteChatHistory(req.params.id);
    if (!affected) return res.status(404).json({ error: "Mensagem não encontrada" });
    res.json({ message: "Mensagem eliminada com sucesso" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
