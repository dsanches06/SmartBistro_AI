import * as roleService from "../services/roleService.js";

// GET /roles
export const getAll = async (req, res) => {
  try {
    const roles = await roleService.getAllRoles();
    res.json(roles);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// GET /roles/:id
export const getById = async (req, res) => {
  try {
    const role = await roleService.getRoleById(req.params.id);
    if (!role) return res.status(404).json({ error: "Role não encontrado" });
    res.json(role);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
