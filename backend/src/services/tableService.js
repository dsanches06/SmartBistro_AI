import { db } from "../db.js";
import { mapTableDTOResponse } from "../dto/mapDTO.js";

// Devolve todas as mesas; filtra por status se fornecido
export const getAllTables = async (status) => {
  let q = "SELECT * FROM tables";
  const p = [];
  if (status) {
    q += " WHERE status = ?";
    p.push(status);
  }
  q += " ORDER BY table_number ASC";
  const [r] = await db.query(q, p);
  return r.map(mapTableDTOResponse);
};

// Devolve uma mesa pelo ID ou null se não existir
export const getTableById = async (id) => {
  const [r] = await db.query("SELECT * FROM tables WHERE id = ?", [id]);
  return r[0] ? mapTableDTOResponse(r[0]) : null;
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
