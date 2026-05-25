import { db } from "../db.js";
import { mapStockDTOResponse } from "../dto/mapDTO.js";

// Devolve todos os registos de stock
export const getAllStock = async () => {
  const [r] = await db.query("SELECT * FROM stock ORDER BY id ASC");
  return r.map(mapStockDTOResponse);
};

// Devolve um registo de stock pelo ID ou null se não existir
export const getStockById = async (id) => {
  const [r] = await db.query("SELECT * FROM stock WHERE id = ?", [id]);
  return r[0] ? mapStockDTOResponse(r[0]) : null;
};

// Devolve o stock de um ingrediente específico (ingredient_id é UNIQUE)
export const getStockByIngredientId = async (ingredientId) => {
  const [r] = await db.query(
    "SELECT * FROM stock WHERE ingredient_id = ?",
    [ingredientId],
  );
  return r[0] ? mapStockDTOResponse(r[0]) : null;
};

// Verifica se já existe registo de stock para o ingrediente
export const stockExistsForIngredient = async (ingredientId, excludeId = null) => {
  const q = excludeId
    ? "SELECT 1 FROM stock WHERE ingredient_id = ? AND id <> ? LIMIT 1"
    : "SELECT 1 FROM stock WHERE ingredient_id = ? LIMIT 1";
  const p = excludeId ? [ingredientId, excludeId] : [ingredientId];
  const [r] = await db.query(q, p);
  return r.length > 0;
};

// Cria um novo registo de stock e devolve o registo criado
export const createStock = async (data) => {
  const [result] = await db.query(
    "INSERT INTO stock (ingredient_id, available_quantity, unit_cost) VALUES (?, ?, ?)",
    [data.ingredient_id, data.available_quantity ?? 0.0, data.unit_cost ?? 0.0],
  );
  return mapStockDTOResponse({
    id: result.insertId,
    ingredient_id: data.ingredient_id,
    available_quantity: data.available_quantity ?? 0.0,
    unit_cost: data.unit_cost ?? 0.0,
    updated_at: new Date(),
  });
};

// Actualiza os campos fornecidos dinamicamente (available_quantity e/ou unit_cost)
export const updateStock = async (id, data) => {
  const fields = [],
    values = [],
    add = (c, v) => {
      fields.push(c + " = ?");
      values.push(v);
    };
  if (data.available_quantity !== undefined) add("available_quantity", data.available_quantity);
  if (data.unit_cost !== undefined) add("unit_cost", data.unit_cost);
  if (!fields.length) return 0;
  values.push(id);
  const [, r] = await db.query(
    `UPDATE stock SET ${fields.join(", ")} WHERE id = ?`,
    values,
  );
  return r.affectedRows;
};

// Ajusta a quantidade disponível somando ou subtraindo um delta
export const adjustQuantity = async (ingredientId, delta) => {
  const [, r] = await db.query(
    "UPDATE stock SET available_quantity = available_quantity + ? WHERE ingredient_id = ?",
    [delta, ingredientId],
  );
  return r.affectedRows;
};

// Elimina um registo de stock e devolve o número de linhas afectadas
export const deleteStock = async (id) => {
  const [, r] = await db.query("DELETE FROM stock WHERE id = ?", [id]);
  return r.affectedRows;
};
