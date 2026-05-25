import { db } from "../db.js";
import { mapCustomerDTOResponse } from "../dto/mapDTO.js";

export const getAllCustomers = async (search, sort) => {
  let q = "SELECT * FROM customers";
  const p = [];
  if (search) {
    q += " WHERE (name LIKE ? OR name LIKE ? OR email LIKE ?)";
    p.push(`${search}%`, `% ${search}%`, `%${search}%`);
  }
  if (sort === "asc" || sort === "desc")
    q += ` ORDER BY name ${sort.toUpperCase()}`;
  const [r] = await db.query(q, p);
  return r.map(mapCustomerDTOResponse);
};

export const getCustomerById = async (id) => {
  const [r] = await db.query("SELECT * FROM customers WHERE id = ?", [id]);
  return r[0] ? mapCustomerDTOResponse(r[0]) : null;
};

export const createCustomer = async (data) => {
  const [result] = await db.query(
    "INSERT INTO customers (name, email, phone, gender) VALUES (?, ?, ?, ?)",
    [data.name, data.email, data.phone ?? "", data.gender ?? "Not specified"],
  );
  return mapCustomerDTOResponse({ id: result.insertId, ...data });
};

export const updateCustomer = async (userId, data) => {
  const fields = [],
    values = [],
    add = (c, v) => {
      fields.push(c + " = ?");
      values.push(v);
    };
  if (data.name !== undefined) add("name", data.name);
  if (data.email !== undefined) add("email", data.email);
  if (data.phone !== undefined) add("phone", data.phone);
  if (data.gender !== undefined) add("gender", data.gender);
  if (!fields.length) return 0;
  values.push(userId);
  const [r] = await db.query(
    `UPDATE customers SET ${fields.join(", ")} WHERE id = ?`,
    values,
  );
  return r.affectedRows;
};

export const deleteCustomer = async (id) => {
  const [r] = await db.query("DELETE FROM customers WHERE id = ?", [id]);
  return r.affectedRows;
};

export const toggleCustomerActive = async (id, data) => {
  const [r] = await db.query("UPDATE customers SET active = ? WHERE id = ?", [
    data.active,
    id,
  ]);
  return r.affectedRows;
};

export const emailExists = async (email, userId = null) => {
  let q = "SELECT 1 FROM customers WHERE email = ?";
  const p = [email];
  if (userId) {
    q += " AND id != ?";
    p.push(userId);
  }
  const [r] = await db.query(q, p);
  return r.length > 0;
};
