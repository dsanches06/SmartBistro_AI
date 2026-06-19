import { db } from "../db.js";
import { mapUserDTOResponse } from "../dto/mapDTO.js";

export const getAllUsers = async (search, sort) => {
  let q = "SELECT * FROM users";
  const p = [];
  if (search) { q += " WHERE name LIKE ?"; p.push(`%${search}%`); }
  if (sort === "asc" || sort === "desc") q += ` ORDER BY name ${sort.toUpperCase()}`;
  const [r] = await db.query(q, p);
  return r.map(mapUserDTOResponse);
};

export const getUserById = async (id) => {
  const [r] = await db.query("SELECT * FROM users WHERE id = ?", [id]);
  return r[0] ? mapUserDTOResponse(r[0]) : null;
};

export const createUser = async (data) => {
  const [result] = await db.query(
    "INSERT INTO users (name, email, phone, role_id) VALUES (?, ?, ?, ?)",
    [data.name, data.email ?? null, data.phone ?? null, data.role_id ?? 2],
  );
  return getUserById(result.insertId);
};

export const findOrCreateUser = async (fullName, phone = null) => {
  if (phone) {
    const [byPhone] = await db.query(
      "SELECT * FROM users WHERE phone = ? LIMIT 1", [phone],
    );
    if (byPhone[0]) return mapUserDTOResponse(byPhone[0]);
  }

  const [withAuth] = await db.query(
    `SELECT u.* FROM users u
     INNER JOIN auth_accounts a ON a.user_id = u.id
     WHERE u.name = ? LIMIT 1`,
    [fullName],
  );
  if (withAuth[0]) {
    if (phone && !withAuth[0].phone) {
      await db.query("UPDATE users SET phone = ? WHERE id = ?", [phone, withAuth[0].id]);
      withAuth[0].phone = phone;
    }
    return mapUserDTOResponse(withAuth[0]);
  }

  const [guestByName] = await db.query(
    `SELECT u.* FROM users u
     LEFT JOIN auth_accounts a ON a.user_id = u.id
     WHERE u.name = ? AND a.id IS NULL
     ORDER BY u.created_at DESC LIMIT 1`,
    [fullName],
  );
  if (guestByName[0]) {
    if (phone && !guestByName[0].phone) {
      await db.query("UPDATE users SET phone = ? WHERE id = ?", [phone, guestByName[0].id]);
      guestByName[0].phone = phone;
    }
    return mapUserDTOResponse(guestByName[0]);
  }

  return createUser({ name: fullName, phone });
};

export const updateUser = async (id, data) => {
  const fields = [], values = [],
    add = (c, v) => { fields.push(c + " = ?"); values.push(v); };
  if (data.name  !== undefined) add("name",  data.name);
  if (data.email !== undefined) add("email", data.email);
  if (data.phone !== undefined) add("phone", data.phone);
  if (!fields.length) return 0;
  values.push(id);
  const [r] = await db.query(`UPDATE users SET ${fields.join(", ")} WHERE id = ?`, values);
  return r.affectedRows;
};

export const toggleUserActive = async (id, active) => {
  const [r] = await db.query("UPDATE users SET active = ? WHERE id = ?", [active, id]);
  return r.affectedRows;
};

export const phoneExists = async (phone, excludeId = null) => {
  let q = "SELECT 1 FROM users WHERE phone = ?";
  const p = [phone];
  if (excludeId) { q += " AND id != ?"; p.push(excludeId); }
  const [r] = await db.query(q, p);
  return r.length > 0;
};

export const emailExists = async (email, excludeId = null) => {
  let q = "SELECT 1 FROM users WHERE email = ?";
  const p = [email];
  if (excludeId) { q += " AND id != ?"; p.push(excludeId); }
  const [r] = await db.query(q, p);
  return r.length > 0;
};

export const deleteUser = async (id) => {
  const [r] = await db.query("DELETE FROM users WHERE id = ?", [id]);
  return r.affectedRows;
};
