import { db } from "../db.js";
import { mapChatHistoryDTOResponse } from "../dto/mapDTO.js";

// Devolve todas as mensagens de chat mapeadas para DTO
export const getAllChatHistory = async () => {
  const [r] = await db.query("SELECT * FROM chat_history");
  return r.map(mapChatHistoryDTOResponse);
};

// Devolve uma mensagem pelo ID ou null se não existir
export const getChatHistoryById = async (id) => {
  const [r] = await db.query("SELECT * FROM chat_history WHERE id = ?", [id]);
  return r[0] ? mapChatHistoryDTOResponse(r[0]) : null;
};

// Devolve mensagens de uma conversa, ordenadas por data de envio
export const getChatHistoryByConversationId = async (conversationId) => {
  const [r] = await db.query(
    "SELECT * FROM chat_history WHERE conversation_id = ? ORDER BY sent_at ASC",
    [conversationId],
  );
  return r.map(mapChatHistoryDTOResponse);
};

// Insere uma nova mensagem e devolve o registo criado
export const createChatHistory = async (data) => {
  if (!data.conversation_id) {
    throw new Error(
      "conversation_id é obrigatório para criar histórico de chat",
    );
  }

  const [result] = await db.query(
    "INSERT INTO chat_history (conversation_id, role_id, content) VALUES (?, ?, ?)",
    [data.conversation_id, data.role_id, data.content],
  );

  return mapChatHistoryDTOResponse({
    id: result.insertId ?? null,
    ...data,
    sent_at: new Date(),
  });
};
// Actualiza os campos fornecidos dinamicamente
export const updateChatHistory = async (id, data) => {
  const keys = Object.keys(data),
    vals = Object.values(data);
  const [, r] = await db.query(
    `UPDATE chat_history SET ${keys.map((k) => k + " = ?").join(", ")} WHERE id = ?`,
    [...vals, id],
  );
  return r.affectedRows ?? 0;
};

// Elimina a mensagem e devolve o número de linhas afectadas
export const deleteChatHistory = async (id) => {
  const [, r] = await db.query("DELETE FROM chat_history WHERE id = ?", [id]);
  return r.affectedRows ?? 0;
};
