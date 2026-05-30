import {
  getAllTables,
  getTableById,
  getTableDetailsById,
  getTableReservationById,
  tableNumberExists,
  createTable,
  updateTable,
  updateTableStatus,
  deleteTable,
} from "../services/index.js";

// GET /tables?status=
export const getAll = async (req, res) => {
  try {
    const { status } = req.query;
    const tables = await getAllTables(status);
    res.json(tables);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// GET /tables/:id
export const getById = async (req, res) => {
  try {
    const table = await getTableById(req.params.id);
    if (!table) return res.status(404).json({ error: "Mesa não encontrada" });
    res.json(table);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// GET /tables/:id/details
export const getDetails = async (req, res) => {
  try {
    const details = await getTableDetailsById(req.params.id);
    if (!details) return res.status(404).json({ error: "Mesa não encontrada" });
    res.json(details);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// GET /tables/:id/reservation
export const getReservation = async (req, res) => {
  try {
    const reservation = await getTableReservationById(req.params.id);
    if (!reservation) return res.status(404).json({ error: "Sem reserva activa para esta mesa" });
    res.json(reservation);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// POST /tables
export const create = async (req, res) => {
  try {
    const { table_number, capacity, status } = req.body;
    if (!table_number) return res.status(400).json({ error: "table_number é obrigatório" });

    const exists = await tableNumberExists(table_number);
    if (exists) return res.status(409).json({ error: "Número de mesa já existe" });

    const table = await createTable({ table_number, capacity, status });
    res.status(201).json(table);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// PUT /tables/:id
export const update = async (req, res) => {
  try {
    const { id } = req.params;
    const { table_number, capacity, status } = req.body;

    if (table_number) {
      const exists = await tableNumberExists(table_number, id);
      if (exists) return res.status(409).json({ error: "Número de mesa já existe" });
    }

    const affected = await updateTable(id, { table_number, capacity, status });
    if (!affected) return res.status(404).json({ error: "Mesa não encontrada" });
    res.json({ message: "Mesa actualizada com sucesso" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// PATCH /tables/:id/status
export const updateStatus = async (req, res) => {
  try {
    const { status } = req.body;
    if (!status) return res.status(400).json({ error: "Campo status é obrigatório" });

    const affected = await updateTableStatus(req.params.id, status);
    if (!affected) return res.status(404).json({ error: "Mesa não encontrada" });
    res.json({ message: `Status da mesa actualizado para ${status}` });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// DELETE /tables/:id
export const remove = async (req, res) => {
  try {
    const affected = await deleteTable(req.params.id);
    if (!affected) return res.status(404).json({ error: "Mesa não encontrada" });
    res.json({ message: "Mesa eliminada com sucesso" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
