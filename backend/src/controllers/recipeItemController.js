import {
  getAllRecipeItems,
  getRecipeItemById,
  getRecipeByItemId,
  getRecipesByIngredientId,
  createRecipeItem,
  updateRecipeItem,
  deleteRecipeItem,
  deleteRecipeByItemId,
} from "../services/index.js";
import { asyncHandler } from "../utils/index.js";

// GET /recipe-items
export const getAll = asyncHandler(async (req, res) => {
  const recipeItems = await getAllRecipeItems();
  res.json(recipeItems);
});

// GET /recipe-items/:id
export const getById = asyncHandler(async (req, res) => {
  const recipeItem = await getRecipeItemById(req.params.id);
  if (!recipeItem) return res.status(404).json({ error: "Ficha técnica não encontrada" });
  res.json(recipeItem);
});

// GET /recipe-items/item/:itemId
export const getByItemId = asyncHandler(async (req, res) => {
  const recipeItems = await getRecipeByItemId(req.params.itemId);
  res.json(recipeItems);
});

// GET /recipe-items/ingredient/:ingredientId
export const getByIngredientId = asyncHandler(async (req, res) => {
  const recipeItems = await getRecipesByIngredientId(req.params.ingredientId);
  res.json(recipeItems);
});

// POST /recipe-items
export const create = asyncHandler(async (req, res) => {
  const { item_id, ingredient_id, required_quantity } = req.body;
  if (!item_id || !ingredient_id || required_quantity === undefined)
    return res.status(400).json({ error: "item_id, ingredient_id e required_quantity são obrigatórios" });

  const recipeItem = await createRecipeItem({ item_id, ingredient_id, required_quantity });
  res.status(201).json(recipeItem);
});

// PUT /recipe-items/:id
export const update = asyncHandler(async (req, res) => {
  const { item_id, ingredient_id, required_quantity } = req.body;
  const affected = await updateRecipeItem(req.params.id, { item_id, ingredient_id, required_quantity });
  if (!affected) return res.status(404).json({ error: "Ficha técnica não encontrada" });
  res.json({ message: "Ficha técnica actualizada com sucesso" });
});

// DELETE /recipe-items/:id
export const remove = asyncHandler(async (req, res) => {
  const affected = await deleteRecipeItem(req.params.id);
  if (!affected) return res.status(404).json({ error: "Ficha técnica não encontrada" });
  res.json({ message: "Entrada da ficha técnica eliminada com sucesso" });
});

// DELETE /recipe-items/item/:itemId
export const removeByItemId = asyncHandler(async (req, res) => {
  const affected = await deleteRecipeByItemId(req.params.itemId);
  res.json({ message: `${affected} entrada(s) da ficha técnica eliminada(s)` });
});
