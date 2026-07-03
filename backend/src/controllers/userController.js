import {
  getAllUsers,
  getUserById,
  createUser,
  updateUser,
  deleteUser,
  toggleUserActive,
  phoneExists,
  emailExists,
} from "../services/userService.js";

// GET /users?search=&sort=
export const getAll = async (req, res) => {
  try {
    res.json(await getAllUsers(req.query.search, req.query.sort));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// GET /users/:id
export const getById = async (req, res) => {
  res.json(req.user);
};

// POST /users
export const create = async (req, res) => {
  try {
    const name  = String(req.body.name  ?? "").trim();
    const email = req.body.email ? String(req.body.email).trim()  : null;
    const phone = req.body.phone ? String(req.body.phone).trim()  : null;

    if (!name) return res.status(400).json({ error: "name é obrigatório" });
    if (name.length < 3 || name.length > 20)
      return res.status(400).json({ error: "O nome deve ter entre 3 e 20 caracteres" });

    if (email && await emailExists(email))
      return res.status(409).json({ error: "Já existe um utilizador com esse email" });

    if (phone && await phoneExists(phone))
      return res.status(409).json({ error: "Já existe um utilizador com esse telefone" });

    res.status(201).json(await createUser({ name, email, phone }));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// PUT /users/:id
export const update = async (req, res) => {
  try {
    const { id } = req.params;
    const name  = req.body.name  !== undefined ? String(req.body.name).trim()  : undefined;
    const email = req.body.email !== undefined ? (req.body.email ? String(req.body.email).trim()  : null) : undefined;
    const phone = req.body.phone !== undefined ? (req.body.phone ? String(req.body.phone).trim() : null) : undefined;

    if (name !== undefined && (name.length < 3 || name.length > 20))
      return res.status(400).json({ error: "O nome deve ter entre 3 e 20 caracteres" });

    if (email && await emailExists(email, id))
      return res.status(409).json({ error: "Já existe um utilizador com esse email" });

    if (phone && await phoneExists(phone, id))
      return res.status(409).json({ error: "Já existe um utilizador com esse telefone" });

    await updateUser(id, { name, email, phone });
    res.json({ message: "Utilizador actualizado com sucesso" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// PATCH /users/:id/active
export const toggleActive = async (req, res) => {
  try {
    const { active } = req.body;
    if (active === undefined)
      return res.status(400).json({ error: "Campo active é obrigatório" });
    await toggleUserActive(req.params.id, active);
    res.json({ message: `Utilizador ${active ? "activado" : "desactivado"} com sucesso` });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// DELETE /users/:id
export const remove = async (req, res) => {
  try {
    await deleteUser(req.params.id);
    res.json({ message: "Utilizador eliminado com sucesso" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
