import {
  getAllCustomers,
  getCustomerById,
  emailExists,
  createCustomer,
  updateCustomer,
  deleteCustomer,
  toggleCustomerActive,
} from "../services/index.js";

// GET /customers?search=&sort=
export const getAll = async (req, res) => {
  try {
    const { search, sort } = req.query;
    const customers = await getAllCustomers(search, sort);
    res.json(customers);
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
    const { name, email, phone, gender } = req.body;
    if (!name || !email) return res.status(400).json({ error: "name e email são obrigatórios" });

    const exists = await emailExists(email);
    if (exists) return res.status(409).json({ error: "Email já registado" });

    const customer = await createCustomer({ name, email, phone, gender });
    res.status(201).json(customer);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// PUT /customers/:id
export const update = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, email, phone, gender } = req.body;

    if (email) {
      const exists = await emailExists(email, id);
      if (exists) return res.status(409).json({ error: "Email já registado por outro cliente" });
    }

    const affected = await updateCustomer(id, { name, email, phone, gender });
    if (!affected) return res.status(404).json({ error: "Cliente não encontrado" });
    res.json({ message: "Cliente actualizado com sucesso" });
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

// PATCH /customers/:id/active
export const toggleActive = async (req, res) => {
  try {
    const { active } = req.body;
    if (active === undefined) return res.status(400).json({ error: "Campo active é obrigatório" });

    const affected = await toggleCustomerActive(req.params.id, { active });
    if (!affected) return res.status(404).json({ error: "Cliente não encontrado" });
    res.json({ message: `Cliente ${active ? "activado" : "desactivado"} com sucesso` });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
