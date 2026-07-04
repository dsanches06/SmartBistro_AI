import {
  getAllStock,
  getStockById,
  getStockByIngredientId,
  stockExistsForIngredient,
  createStock,
  updateStock,
  adjustQuantity as adjustStockQuantity,
  deleteStock,
} from "../services/index.js";
import { asyncHandler } from "../utils/index.js";

// GET /stock
export const getAll = asyncHandler(async (req, res) => {
  const stock = await getAllStock();
  res.json(stock);
});

// GET /stock/:id
export const getById = asyncHandler(async (req, res) => {
  const stock = await getStockById(req.params.id);
  if (!stock) return res.status(404).json({ error: "Registo de stock não encontrado" });
  res.json(stock);
});

// GET /stock/ingredient/:ingredientId
export const getByIngredientId = asyncHandler(async (req, res) => {
  const stock = await getStockByIngredientId(req.params.ingredientId);
  if (!stock) return res.status(404).json({ error: "Stock para esse ingrediente não encontrado" });
  res.json(stock);
});

// POST /stock
export const create = asyncHandler(async (req, res) => {
  const { ingredient_id, available_quantity, unit_cost } = req.body;
  if (!ingredient_id)
    return res.status(400).json({ error: "ingredient_id é obrigatório" });

  const exists = await stockExistsForIngredient(ingredient_id);
  if (exists) return res.status(409).json({ error: "Já existe stock registado para esse ingrediente" });

  const stock = await createStock({ ingredient_id, available_quantity, unit_cost });
  res.status(201).json(stock);
});

// PUT /stock/:id
export const update = asyncHandler(async (req, res) => {
  const { available_quantity, unit_cost } = req.body;
  const affected = await updateStock(req.params.id, { available_quantity, unit_cost });
  if (!affected) return res.status(404).json({ error: "Registo de stock não encontrado" });
  res.json({ message: "Stock actualizado com sucesso" });
});

// PATCH /stock/ingredient/:ingredientId/adjust
export const adjustQuantity = asyncHandler(async (req, res) => {
  const { delta } = req.body;
  if (delta === undefined)
    return res.status(400).json({ error: "Campo delta é obrigatório" });

  const affected = await adjustStockQuantity(req.params.ingredientId, delta);
  if (!affected) return res.status(404).json({ error: "Stock para esse ingrediente não encontrado" });
  res.json({ message: `Quantidade ajustada em ${delta} unidades` });
});

// DELETE /stock/:id
export const remove = asyncHandler(async (req, res) => {
  const affected = await deleteStock(req.params.id);
  if (!affected) return res.status(404).json({ error: "Registo de stock não encontrado" });
  res.json({ message: "Registo de stock eliminado com sucesso" });
});
