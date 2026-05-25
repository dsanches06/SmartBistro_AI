import { db } from "../db.js";
import { mapRecipeItemDTOResponse } from "../dto/mapDTO.js";

// Devolve todas as fichas técnicas
export const getAllRecipeItems = async () => {
  const [r] = await db.query("SELECT * FROM recipe_items ORDER BY item_id, id");
  return r.map(mapRecipeItemDTOResponse);
};

// Devolve uma ficha técnica pelo ID ou null se não existir
export const getRecipeItemById = async (id) => {
  const [r] = await db.query("SELECT * FROM recipe_items WHERE id = ?", [id]);
  return r[0] ? mapRecipeItemDTOResponse(r[0]) : null;
};

// Devolve todos os ingredientes de um item do menu (ficha técnica completa)
export const getRecipeByItemId = async (itemId) => {
  const [r] = await db.query(
    "SELECT * FROM recipe_items WHERE item_id = ? ORDER BY id ASC",
    [itemId],
  );
  return r.map(mapRecipeItemDTOResponse);
};

// Devolve todos os itens do menu que utilizam um determinado ingrediente
export const getRecipesByIngredientId = async (ingredientId) => {
  const [r] = await db.query(
    "SELECT * FROM recipe_items WHERE ingredient_id = ? ORDER BY item_id ASC",
    [ingredientId],
  );
  return r.map(mapRecipeItemDTOResponse);
};

// Cria uma nova entrada na ficha técnica e devolve o registo criado
export const createRecipeItem = async (data) => {
  const [result] = await db.query(
    "INSERT INTO recipe_items (item_id, ingredient_id, required_quantity) VALUES (?, ?, ?)",
    [data.item_id, data.ingredient_id, data.required_quantity],
  );
  return mapRecipeItemDTOResponse({
    id: result.insertId,
    item_id: data.item_id,
    ingredient_id: data.ingredient_id,
    required_quantity: data.required_quantity,
  });
};

// Actualiza a quantidade necessária de um ingrediente na ficha técnica
export const updateRecipeItem = async (id, data) => {
  const fields = [],
    values = [],
    add = (c, v) => {
      fields.push(c + " = ?");
      values.push(v);
    };
  if (data.required_quantity !== undefined) add("required_quantity", data.required_quantity);
  if (data.item_id !== undefined) add("item_id", data.item_id);
  if (data.ingredient_id !== undefined) add("ingredient_id", data.ingredient_id);
  if (!fields.length) return 0;
  values.push(id);
  const [, r] = await db.query(
    `UPDATE recipe_items SET ${fields.join(", ")} WHERE id = ?`,
    values,
  );
  return r.affectedRows;
};

// Elimina uma entrada da ficha técnica e devolve o número de linhas afectadas
export const deleteRecipeItem = async (id) => {
  const [, r] = await db.query("DELETE FROM recipe_items WHERE id = ?", [id]);
  return r.affectedRows;
};

// Elimina toda a ficha técnica de um item do menu
export const deleteRecipeByItemId = async (itemId) => {
  const [, r] = await db.query(
    "DELETE FROM recipe_items WHERE item_id = ?",
    [itemId],
  );
  return r.affectedRows;
};
