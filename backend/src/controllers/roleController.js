import { getAllRoles, getRoleById } from "../services/index.js";
import { asyncHandler } from "../utils/index.js";

// GET /roles
export const getAll = asyncHandler(async (req, res) => {
  const roles = await getAllRoles();
  res.json(roles);
});

// GET /roles/:id
export const getById = asyncHandler(async (req, res) => {
  const role = await getRoleById(req.params.id);
  if (!role) return res.status(404).json({ error: "Role não encontrado" });
  res.json(role);
});
