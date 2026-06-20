import { useMemo, useState } from "react";
import { useNavigate } from "react-router";
import { useQuery } from "@tanstack/react-query";
import {
  Chart as ChartJS,
  CategoryScale, LinearScale, PointElement, LineElement,
  ArcElement, Tooltip, Legend, Filler,
} from "chart.js";
import { Line, Doughnut } from "react-chartjs-2";
import { PageSection, Pagination, KpiCard } from "@/components";
import { orderService, paymentService, tableService, stockService, ingredientService, invoiceService } from "@/services";
import {
  ORDER_STATUS_META, formatTime, formatOrderValue, getOrderTarget, getOrderClientName,
  isToday, isYesterday, pctChange, fmtEur,
  DASHBOARD_HOURS, DASHBOARD_DONUT_META, DASHBOARD_ORDERS_PER_PAGE, DASHBOARD_ALERTS_PER_PAGE,
  buildOperationalAlerts,
  mergeStockWithIngredients,
} from "@/utils";
import { useTheme } from "@/context/ThemeContext";

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, ArcElement, Tooltip, Legend, Filler);

// ── sub-components ────────────────────────────────────────────────────────────

function StatusBadge({ status }) {
  const m = ORDER_STATUS_META[status] ?? { label: status, bg: "#f3f4f6", color: "#9ca3af", text: "#4b5563" };
  return (
    <span style={{
      display: "inline-block",
      backgroundColor: m.bg,
      color: m.text,
      border: `1px solid ${m.color}40`,
      borderRadius: 999,
      padding: "2px 10px",
      fontSize: 12,
      fontWeight: 600,
      whiteSpace: "nowrap",
    }}>
      {m.label}
    </span>
  );
}

// ── main component ────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const navigate = useNavigate();
  const [ordersPage, setOrdersPage] = useState(1);
  const [alertsPage, setAlertsPage] = useState(1);

  const { data: orders      = [] } = useQuery({ queryKey: ["orders"],      queryFn: orderService.getAll,      refetchInterval: 30_000 });
  const { data: tables      = [] } = useQuery({ queryKey: ["tables"],      queryFn: tableService.getAll,      refetchInterval: 30_000 });
  const { data: invoices    = [] } = useQuery({ queryKey: ["invoices"],    queryFn: invoiceService.getAll,    refetchInterval: 30_000 });
  const { data: payments    = [] } = useQuery({ queryKey: ["payments"],    queryFn: paymentService.getAll,    refetchInterval: 30_000 });
  const { data: stockList   = [] } = useQuery({ queryKey: ["stock"],       queryFn: stockService.getAll,      refetchInterval: 30_000 });
  const { data: ingredients = [] } = useQuery({ queryKey: ["ingredients"], queryFn: ingredientService.getAll, refetchInterval: 30_000 });

  // ── KPI data ────────────────────────────────────────────────────────────────
  const todayOrders     = useMemo(() => orders.filter(o => isToday(o.created_at)),     [orders]);
  const yesterdayOrders = useMemo(() => orders.filter(o => isYesterday(o.created_at)), [orders]);
  const completedInvoiceIds = useMemo(() => new Set(
    payments.filter(p => p.payment_status === "Completed").map(p => p.invoice_id)
  ), [payments]);
  const paidInvoices = useMemo(
    () => invoices.filter(inv => completedInvoiceIds.has(inv.id)),
    [invoices, completedInvoiceIds]
  );
  const todayInvoices   = useMemo(() => paidInvoices.filter(i => isToday(i.created_at)),   [paidInvoices]);
  const yesterdayInv    = useMemo(() => paidInvoices.filter(i => isYesterday(i.created_at)), [paidInvoices]);

  const kpis = useMemo(() => {
    const ordersNow  = todayOrders.length;
    const ordersPrev = yesterdayOrders.length;

    const billingNow  = todayInvoices.reduce((s, i) => s + Number(i.total_amount  || 0), 0);
    const billingPrev = yesterdayInv.reduce((s, i)  => s + Number(i.total_amount  || 0), 0);

    const occupied   = tables.filter(t => t.status === "Occupied").length;
    const totalTables = tables.length;

    const completed = todayOrders.filter(o =>
      (o.order_status === "Done" || o.order_status === "Delivered") && o.updated_at
    );
    const avgMin = completed.length > 0
      ? Math.round(completed.reduce((s, o) => s + (new Date(o.updated_at) - new Date(o.created_at)) / 60000, 0) / completed.length)
      : 0;

    return { ordersNow, ordersPrev, billingNow, billingPrev, occupied, totalTables, avgMin };
  }, [todayOrders, yesterdayOrders, todayInvoices, yesterdayInv, tables]);

  // ── line chart ──────────────────────────────────────────────────────────────
  const ordersByHour = useMemo(() =>
    DASHBOARD_HOURS.map(h => {
      const hr = parseInt(h, 10);
      return todayOrders.filter(o => new Date(o.created_at).getHours() === hr).length;
    }), [todayOrders]);

  const lineData = useMemo(() => ({
    labels: DASHBOARD_HOURS,
    datasets: [{
      label: "Pedidos",
      data: ordersByHour,
      borderColor: "#2563eb",
      backgroundColor: isDark ? "rgba(37,99,235,0.15)" : "rgba(37,99,235,0.08)",
      borderWidth: 2,
      pointRadius: 3,
      pointBackgroundColor: "#2563eb",
      fill: true,
      tension: 0.4,
    }],
  }), [ordersByHour, isDark]);

  const chartText = isDark ? "#9ca3af" : "#64748b";
  const chartGrid = isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)";

  const lineOptions = useMemo(() => ({
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { display: false }, tooltip: { mode: "index", intersect: false } },
    scales: {
      x: { ticks: { color: chartText, font: { size: 11 } }, grid: { color: chartGrid } },
      y: { ticks: { color: chartText, font: { size: 11 }, stepSize: 2 }, grid: { color: chartGrid }, min: 0 },
    },
  }), [chartText, chartGrid]);

  // ── donut chart ─────────────────────────────────────────────────────────────
  const donutValues = useMemo(() => {
    const map = Object.fromEntries(DASHBOARD_DONUT_META.map(m => [m.key, 0]));
    orders.forEach(o => { if (o.order_status in map) map[o.order_status]++; });
    return DASHBOARD_DONUT_META.map(m => map[m.key]);
  }, [orders]);

  const doughnutData = useMemo(() => ({
    labels: DASHBOARD_DONUT_META.map(m => m.label),
    datasets: [{
      data: donutValues,
      backgroundColor: DASHBOARD_DONUT_META.map(m => m.color),
      borderWidth: 2,
      borderColor: isDark ? "#111111" : "#ffffff",
    }],
  }), [donutValues, isDark]);

  const doughnutOptions = useMemo(() => ({
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { display: false } },
    cutout: "65%",
  }), []);

  // ── invoice map por order_id ────────────────────────────────────────────────
  const invoiceMap = useMemo(() => {
    const m = {};
    invoices.forEach(inv => { if (inv.order_id) m[inv.order_id] = inv; });
    return m;
  }, [invoices]);

  // ── paginated orders ────────────────────────────────────────────────────────
  const sortedOrders = useMemo(() =>
    [...orders].sort((a, b) => new Date(b.created_at) - new Date(a.created_at)),
    [orders]);

  const pagedOrders = useMemo(() =>
    sortedOrders.slice((ordersPage - 1) * DASHBOARD_ORDERS_PER_PAGE, ordersPage * DASHBOARD_ORDERS_PER_PAGE),
    [sortedOrders, ordersPage]);

  // ── alerts (stock baixo/crítico + pedidos com €0) ──────────────────────────
  const mergedStock = useMemo(
    () => mergeStockWithIngredients(stockList, ingredients),
    [stockList, ingredients],
  );

  const allAlerts = useMemo(
    () => buildOperationalAlerts(mergedStock, orders),
    [mergedStock, orders],
  );

  const pagedAlerts = useMemo(() =>
    allAlerts.slice((alertsPage - 1) * DASHBOARD_ALERTS_PER_PAGE, alertsPage * DASHBOARD_ALERTS_PER_PAGE),
    [allAlerts, alertsPage]);

  // ── render ──────────────────────────────────────────────────────────────────
  return (
    <PageSection title="Dashboard" description="Painel principal do restaurante">

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <KpiCard
          faIcon="fa-solid fa-clipboard-list"
          iconColor="#e11d48"
          iconBg="rgba(225,29,72,0.12)"
          label="Pedidos (Hoje)"
          value={kpis.ordersNow}
          pct={pctChange(kpis.ordersNow, kpis.ordersPrev)}
          up={kpis.ordersNow >= kpis.ordersPrev}
          sub={null}
          onClick={() => navigate("/orders")}
        />
        <KpiCard
          faIcon="fa-solid fa-credit-card"
          iconColor="#0ea5e9"
          iconBg="rgba(14,165,233,0.12)"
          label="Faturação"
          value={fmtEur(kpis.billingNow)}
          pct={pctChange(kpis.billingNow, kpis.billingPrev)}
          up={kpis.billingNow >= kpis.billingPrev}
          sub={null}
          onClick={() => navigate("/faturacao")}
        />
        <KpiCard
          faIcon="fa-solid fa-utensils"
          iconColor="#6366f1"
          iconBg="rgba(99,102,241,0.12)"
          label="Mesas ocupadas"
          value={`${kpis.occupied} / ${kpis.totalTables}`}
          pct={null}
          up={null}
          sub={kpis.totalTables > 0
            ? `${Math.round((kpis.occupied / kpis.totalTables) * 100)}% de ocupação`
            : "sem mesas"}
          onClick={() => navigate("/table")}
        />
        <KpiCard
          faIcon="fa-regular fa-clock"
          iconColor="#f59e0b"
          iconBg="rgba(245,158,11,0.12)"
          label="Tempo médio"
          value={kpis.avgMin > 0 ? `${kpis.avgMin} min` : "— min"}
          pct={null}
          up={null}
          sub="por pedido"
          onClick={() => navigate("/kds")}
        />
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">

        {/* Line chart — Pedidos por hora */}
        <div className="lg:col-span-2 rounded-[20px] bg-[var(--surface)] p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-sm" style={{ color: "var(--text)" }}>Pedidos por hora</h3>
            <span
              className="text-xs px-3 py-1 rounded-full font-medium"
              style={{ background: "var(--surface-2)", color: "var(--text-muted)" }}
            >
              Hoje
            </span>
          </div>
          <div style={{ height: 220 }}>
            <Line data={lineData} options={lineOptions} />
          </div>
        </div>

        {/* Donut chart — Estado dos pedidos */}
        <div className="rounded-[20px] bg-[var(--surface)] p-5 shadow-sm">
          <h3 className="font-semibold text-sm mb-4" style={{ color: "var(--text)" }}>Estado dos pedidos</h3>
          <div className="flex flex-col sm:flex-row items-center gap-4">
            <div className="mx-auto sm:mx-0 flex-shrink-0" style={{ width: 140, height: 140 }}>
              <Doughnut data={doughnutData} options={doughnutOptions} />
            </div>
            <ul className="w-full sm:flex-1 space-y-2">
              {DASHBOARD_DONUT_META.map((m, i) => (
                <li key={m.key} className="flex items-center justify-between text-xs">
                  <span className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: m.color }} />
                    <span style={{ color: "var(--text-secondary)" }}>{m.label}</span>
                  </span>
                  <span className="font-semibold" style={{ color: "var(--text)" }}>{donutValues[i]}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      {/* Bottom row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

        {/* Últimos pedidos */}
        <div className="lg:col-span-2 rounded-[20px] bg-[var(--surface)] p-5 shadow-sm">
          <h3 className="font-semibold text-sm mb-4" style={{ color: "var(--text)" }}>Últimos pedidos</h3>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr style={{ borderBottom: "1px solid var(--border)" }}>
                  <th className="pb-2 text-left text-xs font-semibold pr-3" style={{ color: "var(--text-muted)" }}>#</th>
                  <th className="pb-2 text-left text-xs font-semibold pr-3" style={{ color: "var(--text-muted)" }}>Mesa</th>
                  <th className="pb-2 text-left text-xs font-semibold pr-3 hidden sm:table-cell" style={{ color: "var(--text-muted)" }}>Cliente</th>
                  <th className="pb-2 text-left text-xs font-semibold pr-3" style={{ color: "var(--text-muted)" }}>Estado</th>
                  <th className="pb-2 text-left text-xs font-semibold pr-3" style={{ color: "var(--text-muted)" }}>Valor</th>
                  <th className="pb-2 text-left text-xs font-semibold hidden sm:table-cell" style={{ color: "var(--text-muted)" }}>Hora</th>
                </tr>
              </thead>
              <tbody>
                {pagedOrders.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-xs" style={{ color: "var(--text-muted)" }}>
                      Sem pedidos
                    </td>
                  </tr>
                ) : (
                  pagedOrders.map(order => (
                    <tr
                      key={order.id}
                      className="hover:bg-[var(--surface-2)]"
                      style={{ borderBottom: "1px solid var(--border)" }}
                    >
                      <td className="py-2.5 pr-3 text-xs font-semibold" style={{ color: "var(--primary)" }}>
                        #{order.id}
                      </td>
                      <td className="py-2.5 pr-3 text-xs" style={{ color: "var(--text)" }}>
                        {getOrderTarget(order)}
                      </td>
                      <td className="py-2.5 pr-3 text-xs hidden sm:table-cell" style={{ color: "var(--text)" }}>
                        {getOrderClientName(order)}
                      </td>
                      <td className="py-2.5 pr-3">
                        <StatusBadge status={order.order_status} />
                      </td>
                      <td className="py-2.5 pr-3 text-xs font-semibold" style={{ color: "var(--text)" }}>
                        {invoiceMap[order.id]?.total_amount ? formatOrderValue(invoiceMap[order.id].total_amount) : "—"}
                      </td>
                      <td className="py-2.5 text-xs hidden sm:table-cell" style={{ color: "var(--text-muted)" }}>
                        {formatTime(order.created_at)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="flex flex-wrap items-center justify-between gap-2 mt-4 pt-3" style={{ borderTop: "1px solid var(--border)" }}>
            <p className="text-xs" style={{ color: "var(--text-muted)" }}>
              {sortedOrders.length} pedidos no total
            </p>
            <Pagination
              page={ordersPage}
              total={sortedOrders.length}
              pageSize={DASHBOARD_ORDERS_PER_PAGE}
              onChange={setOrdersPage}
            />
          </div>
        </div>

        {/* Alertas */}
        <div className="rounded-[20px] bg-[var(--surface)] p-5 shadow-sm">
          <h3 className="font-semibold text-sm mb-4" style={{ color: "var(--text)" }}>Alertas</h3>
          {allAlerts.length === 0 ? (
            <p className="text-xs" style={{ color: "var(--text-muted)" }}>Sem alertas activos</p>
          ) : (
            <ul className="space-y-3">
              {pagedAlerts.map(alert => (
                <li key={alert.id} className="flex items-start gap-3">
                  <span
                    className="mt-0.5 w-6 h-6 rounded-full flex-shrink-0 flex items-center justify-center"
                    style={{ background: alert.iconBg }}
                  >
                    <i className={alert.faIcon} style={{ color: alert.iconColor, fontSize: 11 }} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-medium leading-snug" style={{ color: "var(--text)" }}>
                      {alert.title}
                    </p>
                    {alert.sub && (
                      <p className="text-xs mt-0.5 leading-snug" style={{ color: "var(--text-muted)" }}>
                        {alert.sub}
                      </p>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
          {allAlerts.length > 0 && (
            <div className="mt-4 pt-3 flex flex-wrap items-center justify-between gap-2" style={{ borderTop: "1px solid var(--border)" }}>
              <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                {allAlerts.length} alertas
              </p>
              <Pagination
                page={alertsPage}
                total={allAlerts.length}
                pageSize={DASHBOARD_ALERTS_PER_PAGE}
                onChange={setAlertsPage}
              />
            </div>
          )}
        </div>

      </div>
    </PageSection>
  );
}
