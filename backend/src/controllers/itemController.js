import {
  getAllItems,
  getActiveItems,
  getItemById,
  itemNameExists,
  createItem,
  updateItem,
  toggleItemActive,
  deleteItem,
} from "../services/index.js";
import { asyncHandler } from "../utils/index.js";

// GET /items?search=&category=&sort=
export const getAll = asyncHandler(async (req, res) => {
  const { search, category, sort } = req.query;
  const items = await getAllItems(search, category, sort);
  res.json(items);
});

// GET /items/active
export const getActive = asyncHandler(async (req, res) => {
  const items = await getActiveItems();
  res.json(items);
});

// GET /items/:id
export const getById = asyncHandler(async (req, res) => {
  const item = await getItemById(req.params.id);
  if (!item) return res.status(404).json({ error: "Item não encontrado" });
  res.json(item);
});

// POST /items
export const create = asyncHandler(async (req, res) => {
  const { name, category, price, is_active } = req.body;
  if (!name || !category || price === undefined)
    return res.status(400).json({ error: "name, category e price são obrigatórios" });

  const exists = await itemNameExists(name);
  if (exists) return res.status(409).json({ error: "Item com esse nome já existe" });

  const item = await createItem({ name, category, price, is_active });
  res.status(201).json(item);
});

// PUT /items/:id
export const update = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { name, category, price } = req.body;

  if (name) {
    const exists = await itemNameExists(name, id);
    if (exists) return res.status(409).json({ error: "Item com esse nome já existe" });
  }

  const affected = await updateItem(id, { name, category, price });
  if (!affected) return res.status(404).json({ error: "Item não encontrado" });
  res.json({ message: "Item actualizado com sucesso" });
});

// PATCH /items/:id/active
export const toggleActive = asyncHandler(async (req, res) => {
  const { is_active } = req.body;
  if (is_active === undefined)
    return res.status(400).json({ error: "Campo is_active é obrigatório" });

  const affected = await toggleItemActive(req.params.id, is_active);
  if (!affected) return res.status(404).json({ error: "Item não encontrado" });
  res.json({ message: `Item ${is_active ? "activado" : "desactivado"} com sucesso` });
});

// DELETE /items/:id
export const remove = asyncHandler(async (req, res) => {
  const affected = await deleteItem(req.params.id);
  if (!affected) return res.status(404).json({ error: "Item não encontrado" });
  res.json({ message: "Item eliminado com sucesso" });
});
