import * as itemService from "../services/itemService.js";

// GET /items?search=&category=&sort=
export const getAll = async (req, res) => {
  try {
    const { search, category, sort } = req.query;
    const items = await itemService.getAllItems(search, category, sort);
    res.json(items);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// GET /items/active
export const getActive = async (req, res) => {
  try {
    const items = await itemService.getActiveItems();
    res.json(items);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// GET /items/:id
export const getById = async (req, res) => {
  try {
    const item = await itemService.getItemById(req.params.id);
    if (!item) return res.status(404).json({ error: "Item não encontrado" });
    res.json(item);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// POST /items
export const create = async (req, res) => {
  try {
    const { name, category, price, is_active } = req.body;
    if (!name || !category || price === undefined)
      return res.status(400).json({ error: "name, category e price são obrigatórios" });

    const exists = await itemService.itemNameExists(name);
    if (exists) return res.status(409).json({ error: "Item com esse nome já existe" });

    const item = await itemService.createItem({ name, category, price, is_active });
    res.status(201).json(item);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// PUT /items/:id
export const update = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, category, price } = req.body;

    if (name) {
      const exists = await itemService.itemNameExists(name, id);
      if (exists) return res.status(409).json({ error: "Item com esse nome já existe" });
    }

    const affected = await itemService.updateItem(id, { name, category, price });
    if (!affected) return res.status(404).json({ error: "Item não encontrado" });
    res.json({ message: "Item actualizado com sucesso" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// PATCH /items/:id/active
export const toggleActive = async (req, res) => {
  try {
    const { is_active } = req.body;
    if (is_active === undefined)
      return res.status(400).json({ error: "Campo is_active é obrigatório" });

    const affected = await itemService.toggleItemActive(req.params.id, is_active);
    if (!affected) return res.status(404).json({ error: "Item não encontrado" });
    res.json({ message: `Item ${is_active ? "activado" : "desactivado"} com sucesso` });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// DELETE /items/:id
export const remove = async (req, res) => {
  try {
    const affected = await itemService.deleteItem(req.params.id);
    if (!affected) return res.status(404).json({ error: "Item não encontrado" });
    res.json({ message: "Item eliminado com sucesso" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
