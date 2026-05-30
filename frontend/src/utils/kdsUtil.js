// Utilitário KDS: categorias, colunas de status e helpers reutilizáveis
export const KDS_CATEGORIES = [
  { id: "all", label: "Todos" },
  { id: "Appetizer", label: "Entrada" },
  { id: "Main Course", label: "Prato Principal" },
  { id: "Beverage", label: "Bebidas" },
  { id: "Dessert", label: "Sobremesas" },
];

export const KDS_STATUS_COLUMNS = [
  { status: "Pending",        title: "Novos",         accent: "bg-[#fef2f2] text-[#991b1b]", bg: "#fef2f2", bgDark: "rgba(239,68,68,0.10)",   cardBorder: "#ef4444" },
  { status: "In Preparation", title: "Em preparação", accent: "bg-[#fffbeb] text-[#92400e]", bg: "#fffbeb", bgDark: "rgba(245,158,11,0.10)",  cardBorder: "#f59e0b" },
  { status: "Ready",          title: "Prontos",        accent: "bg-[#ecfdf5] text-[#166534]", bg: "#ecfdf5", bgDark: "rgba(34,197,94,0.10)",   cardBorder: "#22c55e" },
  { status: "Delivered",      title: "Entregue",       accent: "bg-[#eff6ff] text-[#1d4ed8]", bg: "#eff6ff", bgDark: "rgba(59,130,246,0.10)",  cardBorder: "#3b82f6" },
];

export function normalizeCategory(value) {
  return value?.trim() || "Unknown";
}

// Normaliza status para exibição na UI (mapeia 'Done' para 'Delivered')
export function mapDisplayStatus(orderStatus) {
  if (!orderStatus) return orderStatus;
  if (String(orderStatus).toLowerCase() === "done") return "Delivered";
  return orderStatus;
}

export function formatTime(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleTimeString("pt-PT", { hour: "2-digit", minute: "2-digit" });
}

export default {
  KDS_CATEGORIES,
  KDS_STATUS_COLUMNS,
  normalizeCategory,
  mapDisplayStatus,
};
