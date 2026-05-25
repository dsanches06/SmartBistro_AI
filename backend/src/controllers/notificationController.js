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

// GET /notifications
export const getAll = async (req, res) => {
  try {
    const notifications = await getAllNotifications();
    res.json(notifications);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// GET /notifications/:id
export const getById = async (req, res) => {
  try {
    const notification = await getNotificationById(req.params.id);
    if (!notification) return res.status(404).json({ error: "Notificação não encontrada" });
    res.json(notification);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// GET /notifications/customer/:customerId
export const getByCustomerId = async (req, res) => {
  try {
    const notifications = await getNotificationsByUser(req.params.customerId);
    res.json(notifications);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// GET /notifications/customer/:customerId/unread
export const getUnread = async (req, res) => {
  try {
    const notifications = await getUnreadNotifications(req.params.customerId);
    res.json(notifications);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// POST /notifications
export const create = async (req, res) => {
  try {
    const { customer_id, title, message } = req.body;
    if (!customer_id || !message)
      return res.status(400).json({ error: "customer_id e message são obrigatórios" });

    const notification = await createNotification({ customer_id, title, message });
    res.status(201).json(notification);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// PUT /notifications/:id
export const update = async (req, res) => {
  try {
    const { title, message, is_read } = req.body;
    const affected = await updateNotification(req.params.id, { title, message, is_read });
    if (!affected) return res.status(404).json({ error: "Notificação não encontrada" });
    res.json({ message: "Notificação actualizada com sucesso" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// PATCH /notifications/:id/read
export const markAsRead = async (req, res) => {
  try {
    const affected = await markNotificationAsRead(req.params.id);
    if (!affected) return res.status(404).json({ error: "Notificação não encontrada" });
    res.json({ message: "Notificação marcada como lida" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// PATCH /notifications/:id/read-status
export const toggleReadStatus = async (req, res) => {
  try {
    const { is_read } = req.body;
    if (is_read === undefined)
      return res.status(400).json({ error: "Campo is_read é obrigatório" });

    const affected = await toggleNotificationReadStatus(req.params.id, is_read);
    if (!affected) return res.status(404).json({ error: "Notificação não encontrada" });
    res.json({ message: `Notificação marcada como ${is_read ? "lida" : "não lida"}` });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// DELETE /notifications/:id
export const remove = async (req, res) => {
  try {
    const affected = await deleteNotification(req.params.id);
    if (!affected) return res.status(404).json({ error: "Notificação não encontrada" });
    res.json({ message: "Notificação eliminada com sucesso" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
