import {
  getAllLogs,
  getLogById,
  getLogsByOrderId,
  getLogsByAgent,
  createLog,
  deleteLog,
  deleteLogsByOrderId,
} from "../services/index.js";
import { asyncHandler } from "../utils/index.js";

// GET /logs?agent_name=&status=
export const getAll = asyncHandler(async (req, res) => {
  const { agent_name, status } = req.query;
  const logs = await getAllLogs(agent_name, status);
  res.json(logs);
});

// GET /logs/:id
export const getById = asyncHandler(async (req, res) => {
  const log = await getLogById(req.params.id);
  if (!log) return res.status(404).json({ error: "Log não encontrado" });
  res.json(log);
});

// GET /logs/order/:orderId
export const getByOrderId = asyncHandler(async (req, res) => {
  const logs = await getLogsByOrderId(req.params.orderId);
  res.json(logs);
});

// GET /logs/agent/:agentName
export const getByAgent = asyncHandler(async (req, res) => {
  const logs = await getLogsByAgent(req.params.agentName);
  res.json(logs);
});

// POST /logs
export const create = asyncHandler(async (req, res) => {
  const { agent_name, status } = req.body;
  if (!agent_name || !status)
    return res.status(400).json({ error: "agent_name e status são obrigatórios" });

  const log = await createLog(req.body);
  res.status(201).json(log);
});

// DELETE /logs/:id
export const remove = asyncHandler(async (req, res) => {
  const affected = await deleteLog(req.params.id);
  if (!affected) return res.status(404).json({ error: "Log não encontrado" });
  res.json({ message: "Log eliminado com sucesso" });
});

// DELETE /logs/order/:orderId
export const removeByOrderId = asyncHandler(async (req, res) => {
  const affected = await deleteLogsByOrderId(req.params.orderId);
  res.json({ message: `${affected} log(s) eliminado(s) para o pedido ${req.params.orderId}` });
});
