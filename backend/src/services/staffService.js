import { db } from "../db.js";
import { mapStaffDTOResponse } from "../dto/mapDTO.js";

const SELECT_STAFF = `
  SELECT s.user_id, s.employee_number, s.hire_date,
         u.name, u.email, u.phone, u.active, u.role_id, u.created_at
  FROM staff s
  INNER JOIN users u ON u.id = s.user_id
`;

export const getAllStaff = async () => {
  const [rows] = await db.query(SELECT_STAFF + " ORDER BY s.hire_date DESC");
  return rows.map(mapStaffDTOResponse);
};

export const getStaffByUserId = async (userId) => {
  const [rows] = await db.query(SELECT_STAFF + " WHERE s.user_id = ?", [userId]);
  return rows[0] ? mapStaffDTOResponse(rows[0]) : null;
};

export const isStaffMember = async (userId) => {
  const [r] = await db.query("SELECT 1 FROM staff WHERE user_id = ? LIMIT 1", [userId]);
  return r.length > 0;
};

export const createStaff = async (userId, hireDate = null) => {
  const [user] = await db.query("SELECT id FROM users WHERE id = ?", [userId]);
  if (!user.length) throw new Error("Utilizador não encontrado");

  const [existing] = await db.query("SELECT user_id FROM staff WHERE user_id = ?", [userId]);
  if (existing.length) throw new Error("Este utilizador já é membro do staff");

  await db.query(
    "INSERT INTO staff (user_id, hire_date) VALUES (?, ?)",
    [userId, hireDate ? new Date(hireDate) : new Date()],
  );
  return getStaffByUserId(userId);
};

export const updateStaffHireDate = async (userId, hireDate) => {
  const [existing] = await db.query("SELECT user_id FROM staff WHERE user_id = ?", [userId]);
  if (!existing.length) throw new Error("Staff member não encontrado");

  await db.query("UPDATE staff SET hire_date = ? WHERE user_id = ?", [new Date(hireDate), userId]);
  return getStaffByUserId(userId);
};

export const deleteStaff = async (userId) => {
  const [r] = await db.query("DELETE FROM staff WHERE user_id = ?", [userId]);
  if (!r.affectedRows) throw new Error("Staff member não encontrado");
  return { success: true };
};
