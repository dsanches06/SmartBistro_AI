import { db } from "../db.js";
import { mapNotificationDTOResponse } from "../dto/mapDTO.js";

// Devolve todas as notificações mapeadas para DTO
export const getAllNotifications = async () => {
  const [r] = await db.query("SELECT * FROM notification");
  return r.map(mapNotificationDTOResponse);
};

// Devolve uma notificação pelo ID ou null se não existir
export const getNotificationById = async (id) => {
  const [r] = await db.query("SELECT * FROM notification WHERE id = ?", [id]);
  return r[0] ? mapNotificationDTOResponse(r[0]) : null;
};

// Devolve as notificações de um cliente, ordenadas das mais recentes
export const getNotificationsByUser = async (customerId) => {
  const [r] = await db.query(
    "SELECT * FROM notification WHERE customer_id = ? ORDER BY sent_at DESC",
    [customerId],
  );
  return r.map(mapNotificationDTOResponse);
};

// Devolve apenas as notificações não lidas de um cliente
export const getUnreadNotifications = async (customerId) => {
  const [r] = await db.query(
    "SELECT * FROM notification WHERE customer_id = ? AND is_read = FALSE ORDER BY sent_at DESC",
    [customerId],
  );
  return r.map(mapNotificationDTOResponse);
};

// Cria uma notificação com data/hora actual
export const createNotification = async (data) => {
  const now = new Date(); // Timestamp de envio
  const [result] = await db.query(
    "INSERT INTO notification (customer_id, title, message, sent_at) VALUES (?, ?, ?, ?)",
    [data.customer_id, data.title || "Notificação", data.message, now],
  );
  return mapNotificationDTOResponse({
    id: result.insertId,
    ...data,
    sent_at: now,
  });
};

// Actualização dinâmica — só actualiza os campos presentes em `data`
// Evita que chamar markAsRead coloque message = NULL
export const updateNotification = async (id, data) => {
  const fields = [];
  const values = [];

  if (data.message !== undefined) {
    fields.push("message = ?");
    values.push(data.message);
  }
  if (data.is_read !== undefined) {
    fields.push("is_read = ?");
    values.push(data.is_read);
  }
  if (data.title !== undefined) {
    fields.push("title = ?");
    values.push(data.title);
  }

  if (fields.length === 0) return 0; // Sem campos para actualizar

  values.push(id);
  const [, r] = await db.query(
    `UPDATE notification SET ${fields.join(", ")} WHERE id = ?`,
    values,
  );
  return r.affectedRows ?? 0;
};

// Alterna o estado de leitura de uma notificação
export const toggleReadStatus = async (id, is_read) => {
  const [, r] = await db.query(
    "UPDATE notification SET is_read = ? WHERE id = ?",
    [is_read, id],
  );
  return r.affectedRows ?? 0;
};

// Elimina uma notificação pelo ID
export const deleteNotification = async (id) => {
  const [, r] = await db.query("DELETE FROM notification WHERE id = ?", [id]);
  return r.affectedRows ?? 0;
};

// Marca uma notificação como lida (atalho para toggleReadStatus)
export const markAsRead = async (id) => toggleReadStatus(id, true);
