import { db } from "../db.js";
import { mapConversationDTOResponse } from "../dto/mapDTO.js";

// Devolve todas as conversas mapeadas para DTO
export const getAllConversations = async () => {
  const [r] = await db.query("SELECT * FROM conversations");
  return r.map(mapConversationDTOResponse);
};

// Devolve uma conversa pelo ID ou null se não existir
export const getConversationById = async (id) => {
  const [r] = await db.query("SELECT * FROM conversations WHERE id = ?", [id]);
  return r[0] ? mapConversationDTOResponse(r[0]) : null;
};

// Cria uma nova conversa; usa customer_id 1 como fallback quando não fornecido
export const createConversation = async (data) => {
  const customerId = Number(data.customer_id) || 1;
  const [result] = await db.query(
    "INSERT INTO conversations (customer_id, title) VALUES (?, ?)",
    [customerId, data.title],
  );

  const id = result.insertId ?? null;
  return mapConversationDTOResponse({
    id,
    customer_id: customerId,
    title: data.title,
    created_at: new Date(),
  });
};

// Actualiza os campos fornecidos dinamicamente
export const updateConversation = async (id, data) => {
  const keys = Object.keys(data),
    vals = Object.values(data);
  const [r] = await db.query(
    `UPDATE conversations SET ${keys.map((k) => k + " = ?").join(", ")} WHERE id = ?`,
    [...vals, id],
  );
  return r.affectedRows ?? 0;
};

// Elimina a conversa e devolve o número de linhas afectadas
export const deleteConversation = async (id) => {
  const [r] = await db.query("DELETE FROM conversations WHERE id = ?", [id]);
  return r.affectedRows ?? 0;
};
