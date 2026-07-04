import {
  getAllReservations,
  getReservationById,
  getReservationsByCustomerId,
  createReservation,
  updateReservationStatus,
  cancelReservation,
  deleteReservation,
  updateTableStatus,
} from "../services/index.js";
import { asyncHandler } from "../utils/index.js";

// GET /reservations?status=
export const getAll = asyncHandler(async (req, res) => {
  const { status } = req.query;
  res.json(await getAllReservations(status));
});

// GET /reservations/:id
export const getById = asyncHandler(async (req, res) => {
  const reservation = await getReservationById(req.params.id);
  if (!reservation) return res.status(404).json({ error: "Reserva não encontrada" });
  res.json(reservation);
});

// GET /reservations/user/:userId
export const getByUserId = asyncHandler(async (req, res) => {
  res.json(await getReservationsByCustomerId(req.params.userId));
});

// POST /reservations
export const create = asyncHandler(async (req, res) => {
  const { user_id, table_id, reservation_date, party_size, phone, notes, status } = req.body;
  if (!reservation_date)
    return res.status(400).json({ error: "reservation_date é obrigatório" });

  const reservation = await createReservation({
    user_id, table_id, reservation_date, party_size, phone, notes, status,
  });
  res.status(201).json(reservation);
});

// PATCH /reservations/:id/status
export const updateStatus = asyncHandler(async (req, res) => {
  const { status } = req.body;
  if (!status) return res.status(400).json({ error: "Campo status é obrigatório" });

  const affected = await updateReservationStatus(req.params.id, status);
  if (!affected) return res.status(404).json({ error: "Reserva não encontrada" });
  res.json({ message: `Status da reserva actualizado para ${status}` });
});

// PATCH /reservations/:id/cancel
export const cancel = asyncHandler(async (req, res) => {
  const reservation = await getReservationById(req.params.id);
  if (!reservation) return res.status(404).json({ error: "Reserva não encontrada" });

  await cancelReservation(req.params.id);

  if (reservation.table_id) {
    await updateTableStatus(reservation.table_id, "Available");
  }

  res.json({ message: "Reserva cancelada com sucesso", table_id: reservation.table_id ?? null });
});

// DELETE /reservations/:id
export const remove = asyncHandler(async (req, res) => {
  const affected = await deleteReservation(req.params.id);
  if (!affected) return res.status(404).json({ error: "Reserva não encontrada" });
  res.json({ message: "Reserva eliminada com sucesso" });
});
