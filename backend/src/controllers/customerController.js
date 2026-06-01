import {
  getAllCustomers,
  getCustomerById,
  createCustomer,
  updateCustomer,
  deleteCustomer,
  toggleCustomerActive,
  nameExists,
  phoneExists,
} from "../services/index.js";

// GET /customers?search=&sort=
export const getAll = async (req, res) => {
  try {
    const { search, sort } = req.query;
    res.json(await getAllCustomers(search, sort));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// GET /customers/:id
export const getById = async (req, res) => {
  try {
    const customer = await getCustomerById(req.params.id);
    if (!customer) return res.status(404).json({ error: "Cliente não encontrado" });
    res.json(customer);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// POST /customers
export const create = async (req, res) => {
  try {
    const name  = String(req.body.name ?? "").trim();
    const phone = req.body.phone ? String(req.body.phone).trim() : null;

    if (!name) return res.status(400).json({ error: "name é obrigatório" });

    if (await nameExists(name))
      return res.status(409).json({ error: "Já existe um cliente com esse nome" });
    if (phone && await phoneExists(phone))
      return res.status(409).json({ error: "Já existe um cliente com esse telefone" });

    res.status(201).json(await createCustomer({ name, phone }));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// PUT /customers/:id
export const update = async (req, res) => {
  try {
    const { id } = req.params;
    const name  = req.body.name  !== undefined ? String(req.body.name).trim()  : undefined;
    const phone = req.body.phone !== undefined ? (req.body.phone ? String(req.body.phone).trim() : null) : undefined;

    if (name !== undefined && await nameExists(name, id))
      return res.status(409).json({ error: "Já existe um cliente com esse nome" });
    if (phone && await phoneExists(phone, id))
      return res.status(409).json({ error: "Já existe um cliente com esse telefone" });

    const affected = await updateCustomer(id, { name, phone });
    if (!affected) return res.status(404).json({ error: "Cliente não encontrado" });
    res.json({ message: "Cliente actualizado com sucesso" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// PATCH /customers/:id/active
export const toggleActive = async (req, res) => {
  try {
    const { active } = req.body;
    if (active === undefined)
      return res.status(400).json({ error: "Campo active é obrigatório" });
    const affected = await toggleCustomerActive(req.params.id, active);
    if (!affected) return res.status(404).json({ error: "Cliente não encontrado" });
    res.json({ message: `Cliente ${active ? "activado" : "desactivado"} com sucesso` });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// DELETE /customers/:id
export const remove = async (req, res) => {
  try {
    const affected = await deleteCustomer(req.params.id);
    if (!affected) return res.status(404).json({ error: "Cliente não encontrado" });
    res.json({ message: "Cliente eliminado com sucesso" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
