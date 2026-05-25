import { db } from "../db.js";
import { mapIngredientDTOResponse } from "../dto/mapDTO.js";

// Devolve todos os ingredientes; suporta pesquisa por nome e ordenação
export const getAllIngredients = async (search, sort) => {
  let q = "SELECT * FROM ingredients";
  const p = [];
  if (search) {
    q += " WHERE name LIKE ?";
    p.push(`%${search}%`);
  }
  if (sort === "asc" || sort === "desc") q += ` ORDER BY name ${sort.toUpperCase()}`;
  else q += " ORDER BY name ASC";
  const [r] = await db.query(q, p);
  return r.map(mapIngredientDTOResponse);
};

// Devolve um ingrediente pelo ID ou null se não existir
export const getIngredientById = async (id) => {
  const [r] = await db.query("SELECT * FROM ingredients WHERE id = ?", [id]);
  return r[0] ? mapIngredientDTOResponse(r[0]) : null;
};

// Verifica se já existe um ingrediente com o mesmo nome (opcionalmente excluindo um ID)
export const ingredientNameExists = async (name, excludeId = null) => {
  const q = excludeId
    ? "SELECT 1 FROM ingredients WHERE name = ? AND id <> ? LIMIT 1"
    : "SELECT 1 FROM ingredients WHERE name = ? LIMIT 1";
  const p = excludeId ? [name, excludeId] : [name];
  const [r] = await db.query(q, p);
  return r.length > 0;
};

// Cria um novo ingrediente e devolve o registo criado
export const createIngredient = async (data) => {
  const [result] = await db.query(
    "INSERT INTO ingredients (name, measurement_unit) VALUES (?, ?)",
    [data.name, data.measurement_unit],
  );
  return mapIngredientDTOResponse({
    id: result.insertId,
    name: data.name,
    measurement_unit: data.measurement_unit,
  });
};

// Actualiza os campos fornecidos dinamicamente
export const updateIngredient = async (id, data) => {
  const fields = [],
    values = [],
    add = (c, v) => {
      fields.push(c + " = ?");
      values.push(v);
    };
  if (data.name !== undefined) add("name", data.name);
  if (data.measurement_unit !== undefined) add("measurement_unit", data.measurement_unit);
  if (!fields.length) return 0;
  values.push(id);
  const [r] = await db.query(
    `UPDATE ingredients SET ${fields.join(", ")} WHERE id = ?`,
    values,
  );
  return r.affectedRows;
};

// Elimina um ingrediente e devolve o número de linhas afectadas
export const deleteIngredient = async (id) => {
  const [r] = await db.query("DELETE FROM ingredients WHERE id = ?", [id]);
  return r.affectedRows;
};
