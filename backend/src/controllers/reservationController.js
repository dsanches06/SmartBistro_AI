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

// GET /reservations?status=
export const getAll = async (req, res) => {
  try {
    const { status } = req.query;
    res.json(await getAllReservations(status));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// GET /reservations/:id
export const getById = async (req, res) => {
  try {
    const reservation = await getReservationById(req.params.id);
    if (!reservation) return res.status(404).json({ error: "Reserva não encontrada" });
    res.json(reservation);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// GET /reservations/customer/:customerId
export const getByCustomer = async (req, res) => {
  try {
    res.json(await getReservationsByCustomerId(req.params.customerId));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// POST /reservations
export const create = async (req, res) => {
  try {
    const { customer_id, table_id, reservation_date, party_size, phone, notes, status } = req.body;
    if (!reservation_date)
      return res.status(400).json({ error: "reservation_date é obrigatório" });

    const reservation = await createReservation({
      customer_id, table_id, reservation_date, party_size, phone, notes, status,
    });
    res.status(201).json(reservation);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// PATCH /reservations/:id/status
export const updateStatus = async (req, res) => {
  try {
    const { status } = req.body;
    if (!status) return res.status(400).json({ error: "Campo status é obrigatório" });

    const affected = await updateReservationStatus(req.params.id, status);
    if (!affected) return res.status(404).json({ error: "Reserva não encontrada" });
    res.json({ message: `Status da reserva actualizado para ${status}` });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// PATCH /reservations/:id/cancel
export const cancel = async (req, res) => {
  try {
    const reservation = await getReservationById(req.params.id);
    if (!reservation) return res.status(404).json({ error: "Reserva não encontrada" });

    await cancelReservation(req.params.id);

    if (reservation.table_id) {
      await updateTableStatus(reservation.table_id, "Available");
    }

    res.json({ message: "Reserva cancelada com sucesso", table_id: reservation.table_id ?? null });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// DELETE /reservations/:id
export const remove = async (req, res) => {
  try {
    const affected = await deleteReservation(req.params.id);
    if (!affected) return res.status(404).json({ error: "Reserva não encontrada" });
    res.json({ message: "Reserva eliminada com sucesso" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
