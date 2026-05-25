import { getAllRoles, getRoleById } from "../services/index.js";

// GET /roles
export const getAll = async (req, res) => {
  try {
    const roles = await getAllRoles();
    res.json(roles);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// GET /roles/:id
export const getById = async (req, res) => {
  try {
    const role = await getRoleById(req.params.id);
    if (!role) return res.status(404).json({ error: "Role não encontrado" });
    res.json(role);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
