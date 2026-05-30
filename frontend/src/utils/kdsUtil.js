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
  { status: "In Preparation", title: "Em preparação", subtitle: "🤖 Bot Chef IA", accent: "bg-[#fffbeb] text-[#92400e]", bg: "#fffbeb", bgDark: "rgba(245,158,11,0.10)",  cardBorder: "#f59e0b" },
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

/* ── Ícones por status ── */
export const KDS_STATUS_ICON = {
  Pending:          "🆕",
  "In Preparation": "🔄",
  Ready:            "✅",
  Delivered:        "🚀",
};

/* ── Tempo alvo por status (segundos) — valores para simulação ── */
export const KDS_STATUS_TARGET_S = {
  Pending:          30,   // 30 s → avança para Em preparação
  "In Preparation": 60,   // 60 s → avança para Pronto
  Ready:            30,   // 30 s → avança para Entregue
  Delivered:        30,   // 30 s → remove do kanban (não da DB)
};

/* ── Hierarquia de status (para comparar se local > DB) ── */
export const KDS_STATUS_ORDER = {
  Pending:          0,
  "In Preparation": 1,
  Ready:            2,
  Delivered:        3,
  Done:             4,
  Cancelled:        5,
};

/* ── Próximo status na sequência ── */
export const KDS_NEXT_STATUS = {
  Pending:          "In Preparation",
  "In Preparation": "Ready",
  Ready:            "Delivered",
};

/* ── Configuração dos eventos de actividade ── */
export const KDS_EVENT_CFG = {
  new_order:      { icon: "🆕", color: "#3b82f6" },
  in_preparation: { icon: "🔄", color: "#f59e0b" },
  ready:          { icon: "✅", color: "#22c55e" },
  delivered:      { icon: "🚀", color: "#8b5cf6" },
  removed:        { icon: "🗑️", color: "#ef4444" },
};

/* ── Mapeamento status → tipo de evento ── */
export const KDS_STATUS_TO_EVENT = {
  Pending:          "new_order",
  "In Preparation": "in_preparation",
  Ready:            "ready",
  Delivered:        "delivered",
};

/** Cria um objecto de evento para o log de actividade */
export function makeKdsEvent(type, order) {
  const cfg  = KDS_EVENT_CFG[type] ?? KDS_EVENT_CFG.new_order;
  const dest = order.table_id ? `Mesa ${order.table_id}` : "Takeaway";
  const msgs = {
    new_order:      `Novo pedido #${order.id} · ${dest} chegou`,
    in_preparation: `Pedido #${order.id} · ${dest} entrou em preparação`,
    ready:          `Pedido #${order.id} · ${dest} está pronto`,
    delivered:      `Pedido #${order.id} · ${dest} foi entregue`,
    removed:        `Pedido #${order.id} · ${dest} removido`,
  };
  return {
    id:      `${type}-${order.id}-${Date.now()}-${Math.random()}`,
    icon:    cfg.icon,
    color:   cfg.color,
    message: msgs[type] ?? `Pedido #${order.id} atualizado`,
    time:    new Date().toLocaleTimeString("pt-PT", { hour: "2-digit", minute: "2-digit", second: "2-digit" }),
  };
}

/** Formata segundos como MM:SS */
export function formatElapsed(seconds) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

/** Cor do timer em função do tempo decorrido vs alvo */
export function kdsTimerColor(elapsed, target) {
  if (!target)                return "#9ca3af";
  if (elapsed < target * 0.6) return "#22c55e";
  if (elapsed < target)       return "#f59e0b";
  return "#ef4444";
}
