/**
 * Converter ID de status do projeto para label
 */
export const getProjectStatusLabel = (statusId) => {
  const statuses = {
    1: "Ativo",
    2: "Em Desenvolvimento",
    3: "Concluido",
  };
  return statuses[statusId] || "Ativo";
};

/**
 * Converter ID de status da tarefa para label
 */
export const getTaskStatusLabel = (statusId) => {
  const statuses = {
    1: "CREATED",
    2: "ASSIGNED",
    3: "IN_PROGRESS",
    4: "BLOCKED",
    5: "COMPLETED",
    6: "ARCHIVED",
  };
  return statuses[statusId] || "CREATED";
};

/**
 * Converter ID de tipo de tarefa para label
 */
export const getTaskTypeLabel = (typeId) => {
  const types = {
    1: "Feature",
    2: "Bug",
    3: "Task",
  };
  return types[typeId] || "Task";
};

/**
 * Converter ID de prioridade para label
 */
export const getPriorityLabel = (priorityId) => {
  const priorities = {
    1: "Baixa",
    2: "Média",
    3: "Alta",
  };
  return priorities[priorityId] || "Média";
};

// Retorna classe Tailwind para badge de prioridade
export const getPriorityBadgeClass = (priority) => {
  return priority === 'alta'
    ? 'bg-red-900 text-red-300'
    : priority === 'média'
      ? 'bg-yellow-900 text-yellow-300'
      : 'bg-green-900 text-green-300';
};

// Retorna estilo inline para badge de prioridade
export const getPriorityBadgeStyle = (priority) => {
  return priority === 'alta'
    ? { backgroundColor: '#7f1d1d', color: '#fca5a5' }
    : priority === 'média'
      ? { backgroundColor: '#78350f', color: '#fef08a' }
      : { backgroundColor: '#166534', color: '#86efac' };
};

// Retorna classe Tailwind para badge de estado
export const getStatusBadgeClass = (status) => {
  return status === 'concluída'
    ? 'bg-green-900 text-green-300'
    : status === 'em progresso'
      ? 'bg-blue-900 text-blue-300'
      : 'bg-gray-800 text-gray-300';
};

// Retorna estilo inline para badge de estado
export const getStatusBadgeStyle = (status) => {
  return status === 'concluída'
    ? { backgroundColor: '#166534', color: '#86efac' }
    : status === 'em progresso'
      ? { backgroundColor: '#1e3a8a', color: '#93c5fd' }
      : { backgroundColor: '#1f2937', color: '#d1d5db' };
};

/**
 * Converter ID de categoria para label
 */
export const getCategoryLabel = (categoryId) => {
  const categories = {
    1: "WORKED",
    2: "PERSONAL",
    3: "STUDY",
  };
  return categories[categoryId] || "WORKED";
};
