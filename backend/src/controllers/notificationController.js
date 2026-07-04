import {
  getAllNotifications,
  getNotificationById,
  getNotificationsByUser,
  getUnreadNotifications,
  createNotification,
  updateNotification,
  markAsRead as markNotificationAsRead,
  toggleReadStatus as toggleNotificationReadStatus,
  deleteNotification,
} from "../services/index.js";
import { asyncHandler } from "../utils/index.js";

// GET /notifications
export const getAll = asyncHandler(async (req, res) => {
  const notifications = await getAllNotifications();
  res.json(notifications);
});

// GET /notifications/:id
export const getById = asyncHandler(async (req, res) => {
  const notification = await getNotificationById(req.params.id);
  if (!notification) return res.status(404).json({ error: "Notificação não encontrada" });
  res.json(notification);
});

// GET /notifications/user/:userId
export const getByUserId = asyncHandler(async (req, res) => {
  const notifications = await getNotificationsByUser(req.params.userId);
  res.json(notifications);
});

// GET /notifications/user/:userId/unread
export const getUnread = asyncHandler(async (req, res) => {
  const notifications = await getUnreadNotifications(req.params.userId);
  res.json(notifications);
});

// POST /notifications
export const create = asyncHandler(async (req, res) => {
  const { user_id, title, message } = req.body;
  if (!user_id || !message)
    return res.status(400).json({ error: "user_id e message são obrigatórios" });

  const notification = await createNotification({ user_id, title, message });
  res.status(201).json(notification);
});

// PUT /notifications/:id
export const update = asyncHandler(async (req, res) => {
  const { title, message, is_read } = req.body;
  const affected = await updateNotification(req.params.id, { title, message, is_read });
  if (!affected) return res.status(404).json({ error: "Notificação não encontrada" });
  res.json({ message: "Notificação actualizada com sucesso" });
});

// PATCH /notifications/:id/read
export const markAsRead = asyncHandler(async (req, res) => {
  const affected = await markNotificationAsRead(req.params.id);
  if (!affected) return res.status(404).json({ error: "Notificação não encontrada" });
  res.json({ message: "Notificação marcada como lida" });
});

// PATCH /notifications/:id/read-status
export const toggleReadStatus = asyncHandler(async (req, res) => {
  const { is_read } = req.body;
  if (is_read === undefined)
    return res.status(400).json({ error: "Campo is_read é obrigatório" });

  const affected = await toggleNotificationReadStatus(req.params.id, is_read);
  if (!affected) return res.status(404).json({ error: "Notificação não encontrada" });
  res.json({ message: `Notificação marcada como ${is_read ? "lida" : "não lida"}` });
});

// DELETE /notifications/:id
export const remove = asyncHandler(async (req, res) => {
  const affected = await deleteNotification(req.params.id);
  if (!affected) return res.status(404).json({ error: "Notificação não encontrada" });
  res.json({ message: "Notificação eliminada com sucesso" });
});
