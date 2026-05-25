import { db } from "../db.js";
import { mapLogDTOResponse } from "../dto/mapDTO.js";

// Devolve todos os logs; suporta filtragem por agent_name e status
export const getAllLogs = async (agentName, status) => {
  let q = "SELECT * FROM logs";
  const p = [];
  const conditions = [];

  if (agentName) {
    conditions.push("agent_name = ?");
    p.push(agentName);
  }
  if (status) {
    conditions.push("status = ?");
    p.push(status);
  }
  if (conditions.length) q += " WHERE " + conditions.join(" AND ");
  q += " ORDER BY created_at DESC";

  const [r] = await db.query(q, p);
  return r.map(mapLogDTOResponse);
};

// Devolve um log pelo ID ou null se não existir
export const getLogById = async (id) => {
  const [r] = await db.query("SELECT * FROM logs WHERE id = ?", [id]);
  return r[0] ? mapLogDTOResponse(r[0]) : null;
};

// Devolve todos os logs de um pedido específico
export const getLogsByOrderId = async (orderId) => {
  const [r] = await db.query(
    "SELECT * FROM logs WHERE order_id = ? ORDER BY created_at ASC",
    [orderId],
  );
  return r.map(mapLogDTOResponse);
};

// Devolve todos os logs de um agente específico
export const getLogsByAgent = async (agentName) => {
  const [r] = await db.query(
    "SELECT * FROM logs WHERE agent_name = ? ORDER BY created_at DESC",
    [agentName],
  );
  return r.map(mapLogDTOResponse);
};

// Regista um novo log do pipeline de agentes
export const createLog = async (data) => {
  const [result] = await db.query(
    `INSERT INTO logs
      (order_id, agent_name, status, input_payload, output_payload)
     VALUES (?, ?, ?, ?, ?)`,
    [
      data.order_id ?? null,
      data.agent_name,
      data.status,
      data.input_payload ? JSON.stringify(data.input_payload) : null,
      data.output_payload ? JSON.stringify(data.output_payload) : null,
    ],
  );
  return mapLogDTOResponse({
    id: result.insertId,
    order_id: data.order_id ?? null,
    agent_name: data.agent_name,
    status: data.status,
    input_payload: data.input_payload ?? null,
    output_payload: data.output_payload ?? null,
    created_at: new Date(),
  });
};

// Elimina um log pelo ID e devolve o número de linhas afectadas
export const deleteLog = async (id) => {
  const [, r] = await db.query("DELETE FROM logs WHERE id = ?", [id]);
  return r.affectedRows;
};

// Elimina todos os logs de um pedido
export const deleteLogsByOrderId = async (orderId) => {
  const [, r] = await db.query(
    "DELETE FROM logs WHERE order_id = ?",
    [orderId],
  );
  return r.affectedRows;
};
