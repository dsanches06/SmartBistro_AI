import {
  getAllIngredients,
  getIngredientById,
  ingredientNameExists,
  createIngredient,
  updateIngredient,
  deleteIngredient,
} from "../services/index.js";
import { asyncHandler } from "../utils/index.js";

// GET /ingredients?search=&sort=
export const getAll = asyncHandler(async (req, res) => {
  const { search, sort } = req.query;
  const ingredients = await getAllIngredients(search, sort);
  res.json(ingredients);
});

// GET /ingredients/:id
export const getById = asyncHandler(async (req, res) => {
  const ingredient = await getIngredientById(req.params.id);
  if (!ingredient) return res.status(404).json({ error: "Ingrediente não encontrado" });
  res.json(ingredient);
});

// POST /ingredients
export const create = asyncHandler(async (req, res) => {
  const { name, measurement_unit } = req.body;
  if (!name || !measurement_unit)
    return res.status(400).json({ error: "name e measurement_unit são obrigatórios" });

  const exists = await ingredientNameExists(name);
  if (exists) return res.status(409).json({ error: "Ingrediente com esse nome já existe" });

  const ingredient = await createIngredient({ name, measurement_unit });
  res.status(201).json(ingredient);
});

// PUT /ingredients/:id
export const update = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { name, measurement_unit } = req.body;

  if (name) {
    const exists = await ingredientNameExists(name, id);
    if (exists) return res.status(409).json({ error: "Ingrediente com esse nome já existe" });
  }

  const affected = await updateIngredient(id, { name, measurement_unit });
  if (!affected) return res.status(404).json({ error: "Ingrediente não encontrado" });
  res.json({ message: "Ingrediente actualizado com sucesso" });
});

// DELETE /ingredients/:id
export const remove = asyncHandler(async (req, res) => {
  const affected = await deleteIngredient(req.params.id);
  if (!affected) return res.status(404).json({ error: "Ingrediente não encontrado" });
  res.json({ message: "Ingrediente eliminado com sucesso" });
});
