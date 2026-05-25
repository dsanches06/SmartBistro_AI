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

// GET /recipe-items
export const getAll = async (req, res) => {
  try {
    const recipeItems = await getAllRecipeItems();
    res.json(recipeItems);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// GET /recipe-items/:id
export const getById = async (req, res) => {
  try {
    const recipeItem = await getRecipeItemById(req.params.id);
    if (!recipeItem) return res.status(404).json({ error: "Ficha técnica não encontrada" });
    res.json(recipeItem);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// GET /recipe-items/item/:itemId
export const getByItemId = async (req, res) => {
  try {
    const recipeItems = await getRecipeByItemId(req.params.itemId);
    res.json(recipeItems);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// GET /recipe-items/ingredient/:ingredientId
export const getByIngredientId = async (req, res) => {
  try {
    const recipeItems = await getRecipesByIngredientId(req.params.ingredientId);
    res.json(recipeItems);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// POST /recipe-items
export const create = async (req, res) => {
  try {
    const { item_id, ingredient_id, required_quantity } = req.body;
    if (!item_id || !ingredient_id || required_quantity === undefined)
      return res.status(400).json({ error: "item_id, ingredient_id e required_quantity são obrigatórios" });

    const recipeItem = await createRecipeItem({ item_id, ingredient_id, required_quantity });
    res.status(201).json(recipeItem);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// PUT /recipe-items/:id
export const update = async (req, res) => {
  try {
    const { item_id, ingredient_id, required_quantity } = req.body;
    const affected = await updateRecipeItem(req.params.id, { item_id, ingredient_id, required_quantity });
    if (!affected) return res.status(404).json({ error: "Ficha técnica não encontrada" });
    res.json({ message: "Ficha técnica actualizada com sucesso" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// DELETE /recipe-items/:id
export const remove = async (req, res) => {
  try {
    const affected = await deleteRecipeItem(req.params.id);
    if (!affected) return res.status(404).json({ error: "Ficha técnica não encontrada" });
    res.json({ message: "Entrada da ficha técnica eliminada com sucesso" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// DELETE /recipe-items/item/:itemId
export const removeByItemId = async (req, res) => {
  try {
    const affected = await deleteRecipeByItemId(req.params.itemId);
    res.json({ message: `${affected} entrada(s) da ficha técnica eliminada(s)` });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
