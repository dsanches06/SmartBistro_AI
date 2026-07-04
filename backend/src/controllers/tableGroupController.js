import { createTableGroup, getTableGroup, dissolveTableGroup } from "../services/index.js";
import { asyncHandler } from "../utils/index.js";

// POST /tables/groups
export const create = async (req, res) => {
  try {
    const { table_ids, user_id } = req.body;
    if (!Array.isArray(table_ids) || table_ids.length < 2)
      return res.status(400).json({ error: "São necessárias pelo menos 2 mesas para criar um grupo." });
    if (!user_id)
      return res.status(400).json({ error: "user_id é obrigatório." });

    const group = await createTableGroup({ tableIds: table_ids, userId: user_id });
    res.status(201).json(group);
  } catch (err) {
    const status = err.message.includes("não estão disponíveis") ? 409 : 500;
    res.status(status).json({ error: err.message });
  }
};

// GET /tables/groups/:groupId
export const getById = asyncHandler(async (req, res) => {
  const group = await getTableGroup(req.params.groupId);
  if (!group) return res.status(404).json({ error: "Grupo não encontrado." });
  res.json(group);
});

// DELETE /tables/groups/:groupId
export const dissolve = asyncHandler(async (req, res) => {
  const affected = await dissolveTableGroup(req.params.groupId);
  if (!affected) return res.status(404).json({ error: "Grupo não encontrado." });
  res.json({ message: "Grupo dissolvido com sucesso." });
});
