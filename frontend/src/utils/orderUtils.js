// Utilitários e constantes da página de Pedidos

export const ORDER_PAGE_SIZE    = 10;
export const ORDERS_PER_PAGE    = 5;   // paginação em listas compactas (ClientesPage, ProfilePage)
export const NOTIFS_PER_PAGE    = 5;   // paginação de notificações

// Estilos de status para tabelas de pedidos (usado em ClientesPage, ProfilePage)
export const ORDER_STATUS_STYLE = {
  "Pending":        { bg: "#FFF7ED", tx: "#C2410C" },
  "In Preparation": { bg: "#EFF6FF", tx: "#1D4ED8" },
  "Ready":          { bg: "#F0FDF4", tx: "#166534" },
  "Done":           { bg: "#F5F3FF", tx: "#6D28D9" },
  "Delivered":      { bg: "#ECFEFF", tx: "#0E7490" },
  "Cancelled":      { bg: "#FEF2F2", tx: "#B91C1C" },
};

export const ORDER_STATUS_META = {
  Pending:          { label: "Novo",          bg: "#eef2ff", color: "#4f46e5", text: "#3730a3" },
  "In Preparation": { label: "Em preparação", bg: "#fffbeb", color: "#f59e0b", text: "#92400e" },
  Ready:            { label: "Pronto",         bg: "#f0fdf4", color: "#22c55e", text: "#166534" },
  Delivered:        { label: "Entregue",       bg: "#eff6ff", color: "#3b82f6", text: "#1d4ed8" },
  Done:             { label: "Concluído",      bg: "#f9fafb", color: "#9ca3af", text: "#4b5563" },
  Cancelled:        { label: "Cancelado",      bg: "#fef2f2", color: "#ef4444", text: "#991b1b" },
};

export const ORDER_TABS = [
  { key: "all",            label: "Todos",          icon: "fa-solid fa-list" },
  { key: "Pending",        label: "Novos",          icon: "fa-solid fa-clock" },
  { key: "In Preparation", label: "Em preparação",  icon: "fa-solid fa-fire" },
  { key: "Ready",          label: "Prontos",        icon: "fa-solid fa-check" },
  { key: "Delivered",      label: "Entregue",       icon: "fa-solid fa-truck" },
  { key: "Done",           label: "Concluído",      icon: "fa-solid fa-check-double" },
];

export const ORDER_TABLE_HEADERS = ["ID", "Mesa", "Cliente", "Estado", "Itens", "Valor", "Hora"];

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

/** Nome do cliente (vem do JOIN orders ↔ customers) */
export function getOrderClientName(order) {
  return order.customer_name?.trim() || "—";
}

/** Etapas de progresso do pedido para o modal de visualização. */
export function getOrderSteps(order) {
  const isTakeaway = !order.table_id;

  if (isTakeaway) {
    return [
      { key: "Pending",        label: "Confirmado & Pago",  icon: "fa-receipt"      },
      { key: "In Preparation", label: "Em preparação",      icon: "fa-fire"         },
      { key: "Ready",          label: "Pronto",              icon: "fa-bell"         },
      { key: "Delivering",     label: "A preparar entrega",  icon: "fa-motorcycle"   },
      { key: "Delivered",      label: "Entregue",            icon: "fa-house"        },
    ];
  }

  // Mesa: pagamento só quando o cliente pedir a conta (Done)
  return [
    { key: "Pending",        label: "Pedido recebido", icon: "fa-clipboard-list" },
    { key: "In Preparation", label: "Em preparação",   icon: "fa-fire"           },
    { key: "Ready",          label: "Pronto",           icon: "fa-bell"           },
    { key: "Delivered",      label: "Entregue",         icon: "fa-utensils"       },
    { key: "Done",           label: "Conta paga",       icon: "fa-credit-card"    },
  ];
}

export function getOrderStepIndex(order) {
  const status = order.order_status;
  const isTakeaway = !order.table_id;

  if (isTakeaway) {
    if (status === "Pending")        return 0;
    if (status === "In Preparation") return 1;
    if (status === "Ready")          return 2;
    if (status === "Delivered")      return 4;
    return 0;
  }

  if (status === "Pending")        return 0;
  if (status === "In Preparation") return 1;
  if (status === "Ready")          return 2;
  if (status === "Delivered")      return 3;
  if (status === "Done")           return 4;
  return 0;
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
