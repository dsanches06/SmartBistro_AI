import { db } from "../db.js";
import { mapRoleDTOResponse } from "../dto/mapDTO.js";

// Devolve todos os papéis ordenados por flow_order e id
export const getAllRoles = async () => {
  const [roles] = await db.query("SELECT * FROM roles ORDER BY flow_order, id");
  return roles.map(mapRoleDTOResponse);
};

// Devolve um papel pelo ID ou null se não existir
export const getRoleById = async (roleId) => {
  const [roles] = await db.query("SELECT * FROM roles WHERE id = ?", [roleId]);
  return roles.length > 0 ? mapRoleDTOResponse(roles[0]) : null;
};

// Verifica se já existe um papel com o mesmo nome (opcionalmente excluindo um ID)
export const roleNameExists = async (name, excludeId = null) => {
  const query = excludeId
    ? "SELECT 1 FROM roles WHERE name = ? AND id <> ? LIMIT 1"
    : "SELECT 1 FROM roles WHERE name = ? LIMIT 1";
  const params = excludeId ? [name, excludeId] : [name];
  const [rows] = await db.query(query, params);
  return rows.length > 0;
};