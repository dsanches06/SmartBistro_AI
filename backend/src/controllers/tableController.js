import * as tableService from "../services/tableService.js";

// GET /tables?status=
export const getAll = async (req, res) => {
  try {
    const { status } = req.query;
    const tables = await tableService.getAllTables(status);
    res.json(tables);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// GET /tables/:id
export const getById = async (req, res) => {
  try {
    const table = await tableService.getTableById(req.params.id);
    if (!table) return res.status(404).json({ error: "Mesa não encontrada" });
    res.json(table);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// POST /tables
export const create = async (req, res) => {
  try {
    const { table_number, capacity, status } = req.body;
    if (!table_number) return res.status(400).json({ error: "table_number é obrigatório" });

    const exists = await tableService.tableNumberExists(table_number);
    if (exists) return res.status(409).json({ error: "Número de mesa já existe" });

    const table = await tableService.createTable({ table_number, capacity, status });
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
      const exists = await tableService.tableNumberExists(table_number, id);
      if (exists) return res.status(409).json({ error: "Número de mesa já existe" });
    }

    const affected = await tableService.updateTable(id, { table_number, capacity, status });
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

    const affected = await tableService.updateTableStatus(req.params.id, status);
    if (!affected) return res.status(404).json({ error: "Mesa não encontrada" });
    res.json({ message: `Status da mesa actualizado para ${status}` });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// DELETE /tables/:id
export const remove = async (req, res) => {
  try {
    const affected = await tableService.deleteTable(req.params.id);
    if (!affected) return res.status(404).json({ error: "Mesa não encontrada" });
    res.json({ message: "Mesa eliminada com sucesso" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
