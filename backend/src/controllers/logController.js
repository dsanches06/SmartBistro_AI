import {
  getAllLogs,
  getLogById,
  getLogsByOrderId,
  getLogsByAgent,
  createLog,
  deleteLog,
  deleteLogsByOrderId,
} from "../services/index.js";

// GET /logs?agent_name=&status=
export const getAll = async (req, res) => {
  try {
    const { agent_name, status } = req.query;
    const logs = await getAllLogs(agent_name, status);
    res.json(logs);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// GET /logs/:id
export const getById = async (req, res) => {
  try {
    const log = await getLogById(req.params.id);
    if (!log) return res.status(404).json({ error: "Log não encontrado" });
    res.json(log);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// GET /logs/order/:orderId
export const getByOrderId = async (req, res) => {
  try {
    const logs = await getLogsByOrderId(req.params.orderId);
    res.json(logs);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// GET /logs/agent/:agentName
export const getByAgent = async (req, res) => {
  try {
    const logs = await getLogsByAgent(req.params.agentName);
    res.json(logs);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// POST /logs
export const create = async (req, res) => {
  try {
    const { agent_name, status } = req.body;
    if (!agent_name || !status)
      return res.status(400).json({ error: "agent_name e status são obrigatórios" });

    const log = await createLog(req.body);
    res.status(201).json(log);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// DELETE /logs/:id
export const remove = async (req, res) => {
  try {
    const affected = await deleteLog(req.params.id);
    if (!affected) return res.status(404).json({ error: "Log não encontrado" });
    res.json({ message: "Log eliminado com sucesso" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// DELETE /logs/order/:orderId
export const removeByOrderId = async (req, res) => {
  try {
    const affected = await deleteLogsByOrderId(req.params.orderId);
    res.json({ message: `${affected} log(s) eliminado(s) para o pedido ${req.params.orderId}` });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
