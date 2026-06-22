import { db } from "../db.js";

// Cria um grupo de mesas + 1 pedido partilhado.
// tableIds[0] é a mesa principal (table_id do order).
export const createTableGroup = async ({ tableIds, userId }) => {
  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();

    const ph = tableIds.map(() => "?").join(", ");
    const [tables] = await conn.query(
      `SELECT id, table_number, status FROM tables WHERE id IN (${ph})`,
      tableIds,
    );

    if (tables.length !== tableIds.length)
      throw new Error("Uma ou mais mesas não existem.");

    const notAvail = tables.filter((t) => t.status !== "Available");
    if (notAvail.length)
      throw new Error(
        `As mesas ${notAvail.map((t) => t.table_number).join(", ")} não estão disponíveis.`,
      );

    // Criar grupo
    const [gRes] = await conn.query("INSERT INTO table_groups () VALUES ()");
    const groupId = gRes.insertId;

    // Inserir membros
    const memberPh = tableIds.map(() => "(?, ?)").join(", ");
    await conn.query(
      `INSERT INTO table_group_members (group_id, table_id) VALUES ${memberPh}`,
      tableIds.flatMap((id) => [groupId, id]),
    );

    // Marcar todas as mesas como Occupied
    await conn.query(
      `UPDATE tables SET status = 'Occupied' WHERE id IN (${ph})`,
      tableIds,
    );

    // Criar 1 pedido ligado ao grupo (table_id = mesa principal)
    const [oRes] = await conn.query(
      `INSERT INTO orders (user_id, table_id, group_id, service_type, allergy_restrictions, kitchen_sequence_json, order_status)
       VALUES (?, ?, ?, 'Table', '', '[]', 'Pending')`,
      [userId, tableIds[0], groupId],
    );

    await conn.commit();
    return { groupId, tableIds, orderId: oRes.insertId };
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
};

// Devolve detalhes de um grupo (id + lista de mesas).
export const getTableGroup = async (groupId) => {
  const [members] = await db.query(
    `SELECT tgm.table_id, t.table_number, t.capacity, t.status
     FROM table_group_members tgm
     JOIN tables t ON t.id = tgm.table_id
     WHERE tgm.group_id = ?`,
    [groupId],
  );
  return members.length ? { id: Number(groupId), tables: members } : null;
};

// Dissolve o grupo: liberta todas as mesas (Available) e apaga o registo.
export const dissolveTableGroup = async (groupId) => {
  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();

    const [members] = await conn.query(
      "SELECT table_id FROM table_group_members WHERE group_id = ?",
      [groupId],
    );
    const tableIds = members.map((m) => m.table_id);

    if (tableIds.length) {
      const ph = tableIds.map(() => "?").join(", ");
      await conn.query(
        `UPDATE tables SET status = 'Available' WHERE id IN (${ph})`,
        tableIds,
      );
    }

    const [r] = await conn.query("DELETE FROM table_groups WHERE id = ?", [groupId]);

    await conn.commit();
    return r.affectedRows;
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
};
