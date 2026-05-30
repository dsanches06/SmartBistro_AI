import { db } from "../db.js";

const BASE_SELECT = `
  SELECT r.*,
         c.name  AS customer_name,
         c.phone AS customer_phone,
         t.table_number,
         t.capacity,
         t.status AS table_status
  FROM reservations r
  LEFT JOIN customers c ON c.id = r.customer_id
  LEFT JOIN tables    t ON t.id = r.table_id
`;

export const getAllReservations = async (status) => {
  let q = BASE_SELECT;
  const p = [];
  if (status) {
    q += " WHERE r.status = ?";
    p.push(status);
  }
  q += " ORDER BY r.reservation_date ASC";
  const [rows] = await db.query(q, p);
  return rows;
};

export const getReservationById = async (id) => {
  const [rows] = await db.query(BASE_SELECT + " WHERE r.id = ?", [id]);
  return rows[0] ?? null;
};

export const getReservationsByCustomerId = async (customerId) => {
  const [rows] = await db.query(
    BASE_SELECT + " WHERE r.customer_id = ? ORDER BY r.reservation_date DESC",
    [customerId],
  );
  return rows;
};

export const getActiveReservationByCustomerId = async (customerId) => {
  const [rows] = await db.query(
    BASE_SELECT +
      " WHERE r.customer_id = ? AND r.status IN ('Pending','Confirmed')" +
      " ORDER BY r.reservation_date ASC LIMIT 1",
    [customerId],
  );
  return rows[0] ?? null;
};

export const getReservationsByTableId = async (tableId) => {
  const [rows] = await db.query(
    BASE_SELECT + " WHERE r.table_id = ? ORDER BY r.reservation_date ASC",
    [tableId],
  );
  return rows;
};

export const createReservation = async (data) => {
  const [result] = await db.query(
    `INSERT INTO reservations
       (customer_id, table_id, reservation_date, party_size, status, phone, notes)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [
      data.customer_id ?? null,
      data.table_id ?? null,
      data.reservation_date,
      data.party_size ?? 1,
      data.status ?? "Pending",
      data.phone ?? null,
      data.notes ?? null,
    ],
  );
  return getReservationById(result.insertId);
};

export const updateReservationStatus = async (id, status) => {
  const [r] = await db.query(
    "UPDATE reservations SET status = ? WHERE id = ?",
    [status, id],
  );
  return r.affectedRows;
};

export const cancelReservation = async (id) => {
  return updateReservationStatus(id, "Cancelled");
};

export const deleteReservation = async (id) => {
  const [r] = await db.query("DELETE FROM reservations WHERE id = ?", [id]);
  return r.affectedRows;
};
