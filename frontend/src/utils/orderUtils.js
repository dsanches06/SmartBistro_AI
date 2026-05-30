// Utilitários e constantes da página de Pedidos

export const ORDER_PAGE_SIZE = 10;

export const ORDER_STATUS_META = {
  Pending:          { label: "Novo",          bg: "#eef2ff", color: "#4f46e5", text: "#3730a3" },
  "In Preparation": { label: "Em preparação", bg: "#fffbeb", color: "#f59e0b", text: "#92400e" },
  Ready:            { label: "Pronto",         bg: "#f0fdf4", color: "#22c55e", text: "#166534" },
  Delivered:        { label: "Entregue",       bg: "#eff6ff", color: "#3b82f6", text: "#1d4ed8" },
  Done:             { label: "Concluído",      bg: "#f9fafb", color: "#9ca3af", text: "#4b5563" },
  Cancelled:        { label: "Cancelado",      bg: "#fef2f2", color: "#ef4444", text: "#991b1b" },
};

export const ORDER_TABS = [
  { key: "all",            label: "Todos" },
  { key: "Pending",        label: "Novos" },
  { key: "In Preparation", label: "Em preparação" },
  { key: "Ready",          label: "Prontos" },
  { key: "Delivered",      label: "Entregue" },
  { key: "Done",           label: "Concluído" },
];

export const ORDER_TABLE_HEADERS = ["ID", "Mesa", "Cliente", "Estado", "Itens", "Valor", "Hora", "Ações"];

/** Número de itens de cozinha de um pedido */
export function getOrderItemCount(order) {
  try {
    const arr = typeof order.kitchen_sequence_json === "string"
      ? JSON.parse(order.kitchen_sequence_json)
      : order.kitchen_sequence_json;
    return Array.isArray(arr) ? arr.length : 0;
  } catch { return 0; }
}

/** Valor total formatado em euros */
export function formatOrderValue(amount) {
  return `€${Number(amount || 0).toFixed(2)}`;
}

/** Destino do pedido: mesa ou takeaway */
export function getOrderTarget(order) {
  return order.table_id ? `Mesa ${order.table_id}` : "Takeaway";
}

/** Nome do cliente com fallback para ID */
export function getOrderClientName(order) {
  return order.customer_name || (order.customer_id ? `Cliente ${order.customer_id}` : "—");
}

/** Filtra e pesquisa uma lista de pedidos */
export function filterOrders(orders, { tab = "all", search = "" } = {}) {
  let list = tab === "all" ? orders : orders.filter(o => o.order_status === tab);
  const q = search.trim().toLowerCase();
  if (q) {
    list = list.filter(o =>
      String(o.id).includes(q) ||
      getOrderTarget(o).toLowerCase().includes(q) ||
      getOrderClientName(o).toLowerCase().includes(q),
    );
  }
  return list;
}

/** Contagem de pedidos por status */
export function countOrdersByStatus(orders) {
  const counts = { all: orders.length };
  for (const { key } of ORDER_TABS) {
    if (key !== "all") counts[key] = orders.filter(o => o.order_status === key).length;
  }
  return counts;
}
