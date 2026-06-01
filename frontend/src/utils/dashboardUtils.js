// Utilitários e constantes do Dashboard

export function isToday(dateStr) {
  const d = new Date(dateStr);
  const n = new Date();
  return d.getDate() === n.getDate() && d.getMonth() === n.getMonth() && d.getFullYear() === n.getFullYear();
}

export function isYesterday(dateStr) {
  const d = new Date(dateStr);
  const y = new Date();
  y.setDate(y.getDate() - 1);
  return d.getDate() === y.getDate() && d.getMonth() === y.getMonth() && d.getFullYear() === y.getFullYear();
}

export function pctChange(now, prev) {
  if (!prev) return now > 0 ? 100 : 0;
  return Math.round(((now - prev) / prev) * 100);
}

export function fmtEur(amount) {
  return amount.toLocaleString("pt-PT", { style: "currency", currency: "EUR" });
}

export function timeAgo(dateStr) {
  const mins = Math.round((Date.now() - new Date(dateStr).getTime()) / 60000);
  if (mins < 1) return "agora";
  if (mins < 60) return `${mins} min`;
  return `${Math.round(mins / 60)}h`;
}

export const DASHBOARD_HOURS = Array.from(
  { length: 16 },
  (_, i) => `${String(i + 7).padStart(2, "0")}:00`,
);

export const DASHBOARD_DONUT_META = [
  { key: "Pending",        label: "Novos",         color: "#6366f1" },
  { key: "In Preparation", label: "Em preparação", color: "#f59e0b" },
  { key: "Delivered",      label: "A caminho",     color: "#3b82f6" },
  { key: "Ready",          label: "Prontos",       color: "#22c55e" },
  { key: "Done",           label: "Concluídos",    color: "#9ca3af" },
];

export const DASHBOARD_ORDERS_PER_PAGE = 5;
export const DASHBOARD_ALERTS_PER_PAGE = 4;

/**
 * Constrói a lista de alertas operacionais a partir do stock mesclado e dos pedidos.
 * Stock crítico/baixo + pedidos activos com valor €0.
 */
export function buildOperationalAlerts(mergedStock = [], orders = []) {
  const alerts = [];

  // ── stock crítico / baixo ──────────────────────────────────────────────────
  mergedStock
    .filter(s => s.status === "Critico" || s.status === "Baixo")
    .sort((a, b) => (a.status === "Critico" ? -1 : 1))
    .forEach(s => {
      alerts.push({
        id: `stock-${s.id}`,
        faIcon: s.status === "Critico" ? "fa-solid fa-circle-exclamation" : "fa-solid fa-triangle-exclamation",
        iconColor: s.status === "Critico" ? "#ef4444" : "#f59e0b",
        iconBg: s.status === "Critico" ? "rgba(239,68,68,0.12)" : "rgba(245,158,11,0.12)",
        title: `Stock ${s.status === "Critico" ? "crítico" : "baixo"}: ${s.name}`,
        sub: `${s.available_quantity} ${s.unit} restantes`,
      });
    });

  // ── pedidos activos com valor €0 ───────────────────────────────────────────
  orders
    .filter(o =>
      (!o.total_amount || Number(o.total_amount) === 0) &&
      o.order_status !== "Cancelled" &&
      o.order_status !== "Done",
    )
    .slice(0, 5)
    .forEach(o => {
      alerts.push({
        id: `order-${o.id}`,
        faIcon: "fa-solid fa-receipt",
        iconColor: "#6366f1",
        iconBg: "rgba(99,102,241,0.12)",
        title: `Pedido #${o.id} com valor €0,00`,
        sub: `${o.table_id ? `Mesa ${o.table_id}` : "Takeaway"} · sem itens faturáveis`,
      });
    });

  return alerts;
}
