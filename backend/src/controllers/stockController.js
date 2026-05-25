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

// GET /stock
export const getAll = async (req, res) => {
  try {
    const stock = await getAllStock();
    res.json(stock);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// GET /stock/:id
export const getById = async (req, res) => {
  try {
    const stock = await getStockById(req.params.id);
    if (!stock) return res.status(404).json({ error: "Registo de stock não encontrado" });
    res.json(stock);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// GET /stock/ingredient/:ingredientId
export const getByIngredientId = async (req, res) => {
  try {
    const stock = await getStockByIngredientId(req.params.ingredientId);
    if (!stock) return res.status(404).json({ error: "Stock para esse ingrediente não encontrado" });
    res.json(stock);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// POST /stock
export const create = async (req, res) => {
  try {
    const { ingredient_id, available_quantity, unit_cost } = req.body;
    if (!ingredient_id)
      return res.status(400).json({ error: "ingredient_id é obrigatório" });

    const exists = await stockExistsForIngredient(ingredient_id);
    if (exists) return res.status(409).json({ error: "Já existe stock registado para esse ingrediente" });

    const stock = await createStock({ ingredient_id, available_quantity, unit_cost });
    res.status(201).json(stock);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// PUT /stock/:id
export const update = async (req, res) => {
  try {
    const { available_quantity, unit_cost } = req.body;
    const affected = await updateStock(req.params.id, { available_quantity, unit_cost });
    if (!affected) return res.status(404).json({ error: "Registo de stock não encontrado" });
    res.json({ message: "Stock actualizado com sucesso" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// PATCH /stock/ingredient/:ingredientId/adjust
export const adjustQuantity = async (req, res) => {
  try {
    const { delta } = req.body;
    if (delta === undefined)
      return res.status(400).json({ error: "Campo delta é obrigatório" });

    const affected = await adjustStockQuantity(req.params.ingredientId, delta);
    if (!affected) return res.status(404).json({ error: "Stock para esse ingrediente não encontrado" });
    res.json({ message: `Quantidade ajustada em ${delta} unidades` });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// DELETE /stock/:id
export const remove = async (req, res) => {
  try {
    const affected = await deleteStock(req.params.id);
    if (!affected) return res.status(404).json({ error: "Registo de stock não encontrado" });
    res.json({ message: "Registo de stock eliminado com sucesso" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
