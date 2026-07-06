import { db } from "../db.js";
import { mapTableDTOResponse } from "../dto/mapDTO.js";

// Devolve todas as mesas; filtra por status se fornecido; inclui group_id se em grupo
export const getAllTables = async (status) => {
  let q = `SELECT t.*, tgm.group_id
           FROM tables t
           LEFT JOIN table_group_members tgm ON tgm.table_id = t.id`;
  const p = [];
  if (status) {
    q += " WHERE t.status = ?";
    p.push(status);
  }
  q += " ORDER BY t.table_number ASC";
  const [r] = await db.query(q, p);
  return r.map(mapTableDTOResponse);
};

// Devolve uma mesa pelo ID ou null se não existir
export const getTableById = async (id) => {
  const [r] = await db.query("SELECT * FROM tables WHERE id = ?", [id]);
  return r[0] ? mapTableDTOResponse(r[0]) : null;
};

export const getTableReservationById = async (id) => {
  const [rows] = await db.query(
    `SELECT r.id, r.reservation_date, r.party_size, r.status, r.phone, r.notes,
            u.name AS user_name
     FROM reservations r
     LEFT JOIN users u ON u.id = r.user_id
     WHERE r.table_id = ? AND r.status IN ('Pending', 'Confirmed')
     ORDER BY r.reservation_date ASC
     LIMIT 1`,
    [id],
  );
  return rows[0] ?? null;
};

export const getTableDetailsById = async (id) => {
  const [tableRows] = await db.query(
    `SELECT t.*, tgm.group_id
     FROM tables t
     LEFT JOIN table_group_members tgm ON tgm.table_id = t.id
     WHERE t.id = ?`,
    [id],
  );
  if (!tableRows[0]) return null;

  const table = mapTableDTOResponse(tableRows[0]);
  const groupId = tableRows[0].group_id ?? null;

  // Mesas irmãs no grupo (excluindo a própria)
  let groupInfo = null;
  if (groupId) {
    const [siblingRows] = await db.query(
      `SELECT tgm.table_id, t.table_number, t.capacity
       FROM table_group_members tgm
       JOIN tables t ON t.id = tgm.table_id
       WHERE tgm.group_id = ? AND tgm.table_id != ?`,
      [groupId, id],
    );
    groupInfo = { id: groupId, siblings: siblingRows };
  }

  const [reservationRows] = await db.query(
    `SELECT r.id, r.reservation_date, r.party_size, r.status, r.phone, r.notes,
            u.name AS user_name
     FROM reservations r
     LEFT JOIN users u ON u.id = r.user_id
     WHERE r.table_id = ? AND r.status IN ('Pending', 'Confirmed')
     ORDER BY r.reservation_date ASC
     LIMIT 1`,
    [id],
  );

  // Procurar o pedido activo: pode estar na mesa directamente ou via group_id
  // (query montada condicionalmente porque o Postgres não infere o tipo de um
  // parâmetro usado só em "? IS NOT NULL" quando groupId é null)
  const orderWhere = groupId
    ? "WHERE (o.table_id = ? OR o.group_id = ?)"
    : "WHERE o.table_id = ?";
  const orderParams = groupId ? [id, groupId] : [id];
  const [orderRows] = await db.query(
    `SELECT o.*, u.name AS user_name
     FROM orders o
     LEFT JOIN users u ON u.id = o.user_id
     ${orderWhere}
       AND o.order_status NOT IN ('Done', 'Cancelled', 'Delivered')
     ORDER BY o.created_at DESC
     LIMIT 1`,
    orderParams,
  );

  const activeReservation = reservationRows[0]
    ? {
        id: reservationRows[0].id,
        user_name: reservationRows[0].user_name ?? "Utilizador desconhecido",
        reservation_date: reservationRows[0].reservation_date,
        party_size: reservationRows[0].party_size,
        status: reservationRows[0].status,
        phone: reservationRows[0].phone ?? null,
        notes: reservationRows[0].notes ?? null,
      }
    : null;

  if (!orderRows[0]) {
    return { ...table, group: groupInfo, activeOrder: null, activeReservation };
  }

  const order = orderRows[0];
  const [summaryRows] = await db.query(
    `SELECT
       COALESCE(SUM(oi.quantity), 0) AS items,
       COALESCE(SUM(oi.quantity * it.price), 0) AS total_amount
     FROM order_items oi
     JOIN items it ON it.id = oi.item_id
     WHERE oi.order_id = ?`,
    [order.id],
  );

  return {
    ...table,
    group: groupInfo,
    activeReservation,
    activeOrder: {
      id: order.id,
      order_ref: `#${order.id}`,
      user_name: order.user_name ?? "Utilizador desconhecido",
      items: summaryRows[0]?.items ?? 0,
      total_amount: Number(summaryRows[0]?.total_amount ?? 0),
      status: order.order_status,
      kitchen_sequence_json: order.kitchen_sequence_json ?? '[]',
    },
  };
};

// Verifica se já existe uma mesa com o mesmo table_number (opcionalmente excluindo um ID)
export const tableNumberExists = async (tableNumber, excludeId = null) => {
  const q = excludeId
    ? "SELECT 1 FROM tables WHERE table_number = ? AND id <> ? LIMIT 1"
    : "SELECT 1 FROM tables WHERE table_number = ? LIMIT 1";
  const p = excludeId ? [tableNumber, excludeId] : [tableNumber];
  const [r] = await db.query(q, p);
  return r.length > 0;
};

// Cria uma nova mesa e devolve o registo criado
export const createTable = async (data) => {
  const [result] = await db.query(
    "INSERT INTO tables (table_number, capacity, status) VALUES (?, ?, ?)",
    [data.table_number, data.capacity ?? 4, data.status ?? "Available"],
  );
  return mapTableDTOResponse({
    id: result.insertId,
    table_number: data.table_number,
    capacity: data.capacity ?? 4,
    status: data.status ?? "Available",
  });
};

// Actualiza os campos fornecidos dinamicamente
export const updateTable = async (id, data) => {
  const fields = [],
    values = [],
    add = (c, v) => {
      fields.push(c + " = ?");
      values.push(v);
    };
  if (data.table_number !== undefined) add("table_number", data.table_number);
  if (data.capacity !== undefined) add("capacity", data.capacity);
  if (data.status !== undefined) add("status", data.status);
  if (!fields.length) return 0;
  values.push(id);
  const [r] = await db.query(
    `UPDATE tables SET ${fields.join(", ")} WHERE id = ?`,
    values,
  );
  return r.affectedRows;
};

// Actualiza apenas o status da mesa (Available / Occupied / Reserved)
export const updateTableStatus = async (id, status) => {
  const [r] = await db.query("UPDATE tables SET status = ? WHERE id = ?", [
    status,
    id,
  ]);
  return r.affectedRows;
};

// Elimina uma mesa e devolve o número de linhas afectadas
export const deleteTable = async (id) => {
  const [r] = await db.query("DELETE FROM tables WHERE id = ?", [id]);
  return r.affectedRows;
};
