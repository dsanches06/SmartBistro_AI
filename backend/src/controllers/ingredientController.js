import {
  getAllIngredients,
  getIngredientById,
  ingredientNameExists,
  createIngredient,
  updateIngredient,
  deleteIngredient,
} from "../services/index.js";

// GET /ingredients?search=&sort=
export const getAll = async (req, res) => {
  try {
    const { search, sort } = req.query;
    const ingredients = await getAllIngredients(search, sort);
    res.json(ingredients);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// GET /ingredients/:id
export const getById = async (req, res) => {
  try {
    const ingredient = await getIngredientById(req.params.id);
    if (!ingredient) return res.status(404).json({ error: "Ingrediente não encontrado" });
    res.json(ingredient);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// POST /ingredients
export const create = async (req, res) => {
  try {
    const { name, measurement_unit } = req.body;
    if (!name || !measurement_unit)
      return res.status(400).json({ error: "name e measurement_unit são obrigatórios" });

    const exists = await ingredientNameExists(name);
    if (exists) return res.status(409).json({ error: "Ingrediente com esse nome já existe" });

    const ingredient = await createIngredient({ name, measurement_unit });
    res.status(201).json(ingredient);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// PUT /ingredients/:id
export const update = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, measurement_unit } = req.body;

    if (name) {
      const exists = await ingredientNameExists(name, id);
      if (exists) return res.status(409).json({ error: "Ingrediente com esse nome já existe" });
    }

    const affected = await updateIngredient(id, { name, measurement_unit });
    if (!affected) return res.status(404).json({ error: "Ingrediente não encontrado" });
    res.json({ message: "Ingrediente actualizado com sucesso" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// DELETE /ingredients/:id
export const remove = async (req, res) => {
  try {
    const affected = await deleteIngredient(req.params.id);
    if (!affected) return res.status(404).json({ error: "Ingrediente não encontrado" });
    res.json({ message: "Ingrediente eliminado com sucesso" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
