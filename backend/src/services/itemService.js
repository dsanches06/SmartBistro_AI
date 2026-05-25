import { db } from "../db.js";
import { mapItemDTOResponse } from "../dto/mapDTO.js";

// Devolve todos os itens; suporta filtragem por categoria, pesquisa por nome e ordenação
export const getAllItems = async (search, category, sort) => {
  let q = "SELECT * FROM items";
  const p = [];
  const conditions = [];

  if (search) {
    conditions.push("name LIKE ?");
    p.push(`%${search}%`);
  }
  if (category) {
    conditions.push("category = ?");
    p.push(category);
  }
  if (conditions.length) q += " WHERE " + conditions.join(" AND ");
  if (sort === "asc" || sort === "desc")
    q += ` ORDER BY name ${sort.toUpperCase()}`;

  const [r] = await db.query(q, p);
  return r.map(mapItemDTOResponse);
};

// Devolve apenas os itens activos do menu
export const getActiveItems = async () => {
  const [r] = await db.query(
    "SELECT * FROM items WHERE is_active = TRUE ORDER BY category, name",
  );
  return r.map(mapItemDTOResponse);
};

// Devolve um item pelo ID ou null se não existir
export const getItemById = async (id) => {
  const [r] = await db.query("SELECT * FROM items WHERE id = ?", [id]);
  return r[0] ? mapItemDTOResponse(r[0]) : null;
};

// Verifica se já existe um item com o mesmo nome (opcionalmente excluindo um ID)
export const itemNameExists = async (name, excludeId = null) => {
  const q = excludeId
    ? "SELECT 1 FROM items WHERE name = ? AND id <> ? LIMIT 1"
    : "SELECT 1 FROM items WHERE name = ? LIMIT 1";
  const p = excludeId ? [name, excludeId] : [name];
  const [r] = await db.query(q, p);
  return r.length > 0;
};

// Cria um novo item e devolve o registo criado
export const createItem = async (data) => {
  const [result] = await db.query(
    "INSERT INTO items (name, category, price, is_active) VALUES (?, ?, ?, ?)",
    [data.name, data.category, data.price, data.is_active ?? true],
  );
  return mapItemDTOResponse({
    id: result.insertId,
    name: data.name,
    category: data.category,
    price: data.price,
    is_active: data.is_active ?? true,
  });
};

// Actualiza os campos fornecidos dinamicamente
export const updateItem = async (id, data) => {
  const fields = [],
    values = [],
    add = (c, v) => {
      fields.push(c + " = ?");
      values.push(v);
    };
  if (data.name !== undefined) add("name", data.name);
  if (data.category !== undefined) add("category", data.category);
  if (data.price !== undefined) add("price", data.price);
  if (!fields.length) return 0;
  values.push(id);
  const [, r] = await db.query(
    `UPDATE items SET ${fields.join(", ")} WHERE id = ?`,
    values,
  );
  return r.affectedRows;
};

// Activa ou desactiva um item do menu
export const toggleItemActive = async (id, is_active) => {
  const [, r] = await db.query("UPDATE items SET is_active = ? WHERE id = ?", [
    is_active,
    id,
  ]);
  return r.affectedRows;
};

// Elimina um item e devolve o número de linhas afectadas
export const deleteItem = async (id) => {
  const [, r] = await db.query("DELETE FROM items WHERE id = ?", [id]);
  return r.affectedRows;
};
