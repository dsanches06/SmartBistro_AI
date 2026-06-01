import { db } from "../db.js";
import { mapCustomerDTOResponse } from "../dto/mapDTO.js";

// Devolve todos os clientes; suporta pesquisa por nome
export const getAllCustomers = async (search, sort) => {
  let q = "SELECT * FROM customers";
  const p = [];
  if (search) {
    q += " WHERE name LIKE ?";
    p.push(`%${search}%`);
  }
  if (sort === "asc" || sort === "desc")
    q += ` ORDER BY name ${sort.toUpperCase()}`;
  const [r] = await db.query(q, p);
  return r.map(mapCustomerDTOResponse);
};

// Devolve um cliente pelo ID ou null se não existir
export const getCustomerById = async (id) => {
  const [r] = await db.query("SELECT * FROM customers WHERE id = ?", [id]);
  return r[0] ? mapCustomerDTOResponse(r[0]) : null;
};

// Cria um novo cliente — nome obrigatório; telefone opcional
export const createCustomer = async (data) => {
  const [result] = await db.query(
    "INSERT INTO customers (name, phone) VALUES (?, ?)",
    [data.name, data.phone ?? null],
  );
  return mapCustomerDTOResponse({
    id: result.insertId,
    name: data.name,
    phone: data.phone ?? null,
    active: true,
    created_at: new Date(),
  });
};

/**
 * Procura um cliente pelo nome completo ou pelo telefone.
 * Se não existir, cria um novo registo.
 * Garante: nomes únicos + telefones únicos.
 *
 * @param {string}      fullName  — nome completo (ex: "Ana Pereira")
 * @param {string|null} phone     — telefone opcional
 * @returns {object} cliente encontrado ou criado
 */
export const findOrCreateCustomer = async (fullName, phone = null) => {
  // 1 — procura por nome exacto
  const [byName] = await db.query(
    "SELECT * FROM customers WHERE name = ? LIMIT 1",
    [fullName],
  );
  if (byName[0]) {
    // actualiza o telefone se o cliente ainda não tem nenhum
    if (phone && !byName[0].phone) {
      await db.query("UPDATE customers SET phone = ? WHERE id = ?", [phone, byName[0].id]);
      byName[0].phone = phone;
    }
    return mapCustomerDTOResponse(byName[0]);
  }

  // 2 — procura por telefone (se fornecido) — mesmo cliente, nome diferente
  if (phone) {
    const [byPhone] = await db.query(
      "SELECT * FROM customers WHERE phone = ? LIMIT 1",
      [phone],
    );
    if (byPhone[0]) return mapCustomerDTOResponse(byPhone[0]);
  }

  // 3 — cria novo cliente
  return createCustomer({ name: fullName, phone });
};

// Actualiza nome e/ou telefone do cliente
export const updateCustomer = async (id, data) => {
  const fields = [],
    values = [],
    add = (c, v) => { fields.push(c + " = ?"); values.push(v); };
  if (data.name  !== undefined) add("name",  data.name);
  if (data.phone !== undefined) add("phone", data.phone);
  if (!fields.length) return 0;
  values.push(id);
  const [r] = await db.query(
    `UPDATE customers SET ${fields.join(", ")} WHERE id = ?`,
    values,
  );
  return r.affectedRows;
};

// Activa ou desactiva um cliente
export const toggleCustomerActive = async (id, active) => {
  const [r] = await db.query(
    "UPDATE customers SET active = ? WHERE id = ?",
    [active, id],
  );
  return r.affectedRows;
};

// Verifica se já existe um cliente com esse nome (excluindo o próprio em updates)
export const nameExists = async (name, excludeId = null) => {
  let q = "SELECT 1 FROM customers WHERE name = ?";
  const p = [name];
  if (excludeId) { q += " AND id != ?"; p.push(excludeId); }
  const [r] = await db.query(q, p);
  return r.length > 0;
};

// Verifica se já existe um cliente com esse telefone (excluindo o próprio em updates)
export const phoneExists = async (phone, excludeId = null) => {
  let q = "SELECT 1 FROM customers WHERE phone = ?";
  const p = [phone];
  if (excludeId) { q += " AND id != ?"; p.push(excludeId); }
  const [r] = await db.query(q, p);
  return r.length > 0;
};

// Elimina um cliente
export const deleteCustomer = async (id) => {
  const [r] = await db.query("DELETE FROM customers WHERE id = ?", [id]);
  return r.affectedRows;
};
