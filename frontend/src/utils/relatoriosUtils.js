// Utilitários e constantes da página de Relatórios

export const TODAY_STR      = new Date().toISOString().slice(0, 10);
export const THIRTY_AGO_STR = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

export const DONUT_COLORS = ["#6366f1", "#f59e0b", "#3b82f6", "#22c55e", "#9ca3af"];

export const BAR_STATUS_COLORS = {
  Pending: "#6366f1", "In Preparation": "#f59e0b",
  Ready: "#22c55e", Delivered: "#3b82f6", Done: "#9ca3af", Cancelled: "#ef4444",
};

export const STATUS_LABELS = {
  Pending: "Novos", "In Preparation": "Em prep.", Ready: "Prontos",
  Delivered: "Entregue", Done: "Concluído", Cancelled: "Cancelado",
};

export const REPORT_SECTIONS = [
  { key: "vendas",      label: "Vendas",      icon: "fa-solid fa-chart-line" },
  { key: "pedidos",     label: "Pedidos",     icon: "fa-solid fa-receipt" },
  { key: "produtos",    label: "Produtos",    icon: "fa-solid fa-box" },
  { key: "mesas",       label: "Mesas",       icon: "fa-solid fa-chair" },
  { key: "clientes",    label: "Clientes",    icon: "fa-solid fa-users" },
  { key: "desempenho",  label: "Desempenho",  icon: "fa-solid fa-gauge-high" },
];

export const REPORT_PERIODS = [
  { key: "hoje",          label: "Hoje" },
  { key: "semana",        label: "Esta semana" },
  { key: "mes",           label: "Este mês" },
  { key: "personalizado", label: "Personalizado" },
];

/** Devolve { from, to } para o período seleccionado. "mes" = últimos 30 dias. */
export function getPeriodRange(period, customFrom = null, customTo = null) {
  const now = new Date();
  switch (period) {
    case "hoje": {
      const s = new Date(now); s.setHours(0, 0, 0, 0);
      const e = new Date(now); e.setHours(23, 59, 59, 999);
      return { from: s, to: e };
    }
    case "semana": {
      const s = new Date(now); s.setDate(now.getDate() - 6); s.setHours(0, 0, 0, 0);
      return { from: s, to: now };
    }
    case "mes": {
      const s = new Date(now); s.setDate(now.getDate() - 29); s.setHours(0, 0, 0, 0);
      return { from: s, to: now };
    }
    case "personalizado":
      if (customFrom && customTo)
        return { from: new Date(customFrom + "T00:00:00"), to: new Date(customTo + "T23:59:59") };
      // fallback: últimos 30 dias
      const s2 = new Date(now); s2.setDate(now.getDate() - 29); s2.setHours(0, 0, 0, 0);
      return { from: s2, to: now };
    default:
      return { from: new Date(0), to: now };
  }
}

/** Período anterior equivalente (para comparação de %) */
export function getPrevRange(from, to) {
  const dur = to - from;
  return { from: new Date(from.getTime() - dur), to: new Date(from.getTime() - 1) };
}

/** Filtra array por intervalo de datas num campo específico */
export function filterByRange(items, dateField, from, to) {
  return items.filter(item => {
    const d = new Date(item[dateField]);
    return d >= from && d <= to;
  });
}

/** Gera array de labels dd/mm para um intervalo de datas */
export function generateDayLabels(from, to) {
  const labels = [];
  const cur = new Date(from); cur.setHours(0, 0, 0, 0);
  const end = new Date(to);   end.setHours(23, 59, 59, 999);
  while (cur <= end) {
    labels.push(cur.toLocaleDateString("pt-PT", { day: "2-digit", month: "2-digit" }));
    cur.setDate(cur.getDate() + 1);
  }
  return labels;
}

/** Agrupa itens por dia com soma de um campo numérico */
export function groupByDay(items, dateField, valueField) {
  const map = {};
  items.forEach(item => {
    const key = new Date(item[dateField]).toLocaleDateString("pt-PT", { day: "2-digit", month: "2-digit" });
    map[key] = (map[key] || 0) + Number(item[valueField] || 0);
  });
  return map;
}

/** Top produtos por quantidade vendida (com categoria "Outros" para o resto) */
export function getTopProducts(orderItems, itemMap, limit = 4) {
  const counts = {};
  orderItems.forEach(oi => {
    counts[oi.item_id] = (counts[oi.item_id] || 0) + (oi.quantity || 1);
  });
  const total = Object.values(counts).reduce((s, c) => s + c, 0);
  if (!total) return [];
  const sorted = Object.entries(counts)
    .sort(([, a], [, b]) => b - a)
    .slice(0, limit)
    .map(([id, count]) => ({
      id: Number(id),
      name: itemMap.get(Number(id))?.name ?? `Item ${id}`,
      count,
      pct: Math.round((count / total) * 100),
    }));
  const topTotal = sorted.reduce((s, p) => s + p.count, 0);
  const otherCount = total - topTotal;
  if (otherCount > 0)
    sorted.push({ id: 0, name: "Outros", count: otherCount, pct: Math.round((otherCount / total) * 100) });
  return sorted;
}

/** Produtos ordenados por receita */
export function getProductRevenue(orderItems, itemMap) {
  const map = {};
  orderItems.forEach(oi => {
    const item = itemMap.get(oi.item_id);
    if (!item) return;
    if (!map[oi.item_id]) map[oi.item_id] = { name: item.name, qty: 0, revenue: 0 };
    map[oi.item_id].qty     += oi.quantity || 1;
    map[oi.item_id].revenue += (oi.quantity || 1) * Number(item.price || 0);
  });
  return Object.values(map).sort((a, b) => b.revenue - a.revenue);
}

/** Contagem de pedidos por status */
export function countByStatus(orders) {
  const m = {};
  orders.forEach(o => { m[o.order_status] = (m[o.order_status] || 0) + 1; });
  return m;
}
