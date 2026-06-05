import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Chart as ChartJS,
  CategoryScale, LinearScale, BarElement,
  ArcElement, Tooltip, Legend, Filler,
} from "chart.js";
import { Bar, Doughnut } from "react-chartjs-2";
import { PageSection } from "@/components";
import {
  invoiceService, orderService, orderItemService,
  itemService, tableService, customerService,
} from "@/services";
import { fmtEur } from "@/utils";
import { useTheme } from "@/context/ThemeContext";
import {
  REPORT_SECTIONS, REPORT_PERIODS,
  getPeriodRange, getPrevRange, filterByRange, pctChange,
  generateDayLabels, groupByDay, getTopProducts,
  getProductRevenue, countByStatus,
  TODAY_STR, THIRTY_AGO_STR,
  DONUT_COLORS, BAR_STATUS_COLORS, STATUS_LABELS,
} from "@/utils";

ChartJS.register(CategoryScale, LinearScale, BarElement, ArcElement, Tooltip, Legend, Filler);

function TrendBadge({ pct, up }) {
  if (pct === null) return null;
  return (
    <span className="text-xs font-semibold" style={{ color: up ? "#22c55e" : "#ef4444" }}>
      {up ? "↑" : "↓"} {Math.abs(pct)}%
    </span>
  );
}

function KpiTile({ label, value, pct, up }) {
  return (
    <div className="rounded-[16px] bg-[var(--surface-2)] p-4">
      <p className="text-xs font-medium mb-1" style={{ color: "var(--text-muted)" }}>{label}</p>
      <p className="text-xl sm:text-2xl font-bold" style={{ color: "var(--text)" }}>{value}</p>
      <TrendBadge pct={pct} up={up} />
    </div>
  );
}

function SectionEmpty() {
  return (
    <div className="py-12 text-center text-sm" style={{ color: "var(--text-muted)" }}>
      Sem dados para o período seleccionado
    </div>
  );
}

// ── section: Vendas ───────────────────────────────────────────────────────────

function VendasSection({ invoices, prevInvoices, orders, prevOrders, orderItems, itemMap, range, isDark }) {
  const chartText = isDark ? "#9ca3af" : "#64748b";
  const chartGrid = isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)";

  const totalNow  = invoices.reduce((s, i) => s + Number(i.total_amount || 0), 0);
  const totalPrev = prevInvoices.reduce((s, i) => s + Number(i.total_amount || 0), 0);
  const ordersPct = pctChange(orders.length, prevOrders.length);
  const avgNow    = orders.length ? totalNow / orders.length : 0;
  const avgPrev   = prevOrders.length ? totalPrev / prevOrders.length : 0;

  const periodOrderIds = useMemo(() => new Set(orders.map(o => o.id)), [orders]);
  const periodItems    = useMemo(() => orderItems.filter(oi => periodOrderIds.has(oi.order_id)), [orderItems, periodOrderIds]);
  const prevOrderIds   = useMemo(() => new Set(prevOrders.map(o => o.id)), [prevOrders]);
  const prevItems      = useMemo(() => orderItems.filter(oi => prevOrderIds.has(oi.order_id)), [orderItems, prevOrderIds]);
  const itemsNow  = periodItems.reduce((s, oi) => s + (oi.quantity || 1), 0);
  const itemsPrev = prevItems.reduce((s, oi) => s + (oi.quantity || 1), 0);

  // Bar chart
  const dayLabels = generateDayLabels(range.from, range.to);
  const dayMap    = groupByDay(invoices, "issued_at", "total_amount");
  const barData = {
    labels: dayLabels,
    datasets: [{
      label: "Vendas (€)",
      data: dayLabels.map(l => dayMap[l] ?? 0),
      backgroundColor: isDark ? "rgba(99,102,241,0.8)" : "#6366f1",
      borderRadius: 6,
    }],
  };
  const barOpts = {
    responsive: true, maintainAspectRatio: false,
    plugins: { legend: { display: false }, tooltip: { callbacks: { label: c => `€${c.raw.toFixed(2)}` } } },
    scales: {
      x: { ticks: { color: chartText, font: { size: 10 }, maxRotation: 45 }, grid: { color: chartGrid } },
      y: { ticks: { color: chartText, font: { size: 10 } }, grid: { color: chartGrid }, min: 0 },
    },
  };

  // Donut chart
  const topProds = getTopProducts(periodItems, itemMap);
  const donutData = {
    labels: topProds.map(p => p.name),
    datasets: [{
      data: topProds.map(p => p.count),
      backgroundColor: DONUT_COLORS.slice(0, topProds.length),
      borderWidth: 2,
      borderColor: isDark ? "#111" : "#fff",
    }],
  };
  const donutOpts = {
    responsive: true, maintainAspectRatio: false,
    plugins: { legend: { display: false } },
    cutout: "62%",
  };

  if (!invoices.length && !orders.length) return <SectionEmpty />;

  return (
    <div className="space-y-6">
      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <KpiTile label="Faturação" value={fmtEur(totalNow)} pct={pctChange(totalNow, totalPrev)} up={totalNow >= totalPrev} />
        <KpiTile label="Pedidos" value={orders.length} pct={ordersPct} up={orders.length >= prevOrders.length} />
        <KpiTile label="Ticket Médio" value={fmtEur(avgNow)} pct={pctChange(avgNow, avgPrev)} up={avgNow >= avgPrev} />
        <KpiTile label="Itens vendidos" value={itemsNow.toLocaleString("pt-PT")} pct={pctChange(itemsNow, itemsPrev)} up={itemsNow >= itemsPrev} />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 rounded-[16px] bg-[var(--surface-2)] p-4">
          <h4 className="text-sm font-semibold mb-3" style={{ color: "var(--text)" }}>Vendas por dia</h4>
          <div style={{ height: 200 }}>
            <Bar data={barData} options={barOpts} />
          </div>
        </div>
        <div className="rounded-[16px] bg-[var(--surface-2)] p-4">
          <h4 className="text-sm font-semibold mb-3" style={{ color: "var(--text)" }}>Top produtos</h4>
          <div className="flex flex-col sm:flex-row lg:flex-col items-center gap-4">
            <div style={{ width: 140, height: 140, flexShrink: 0, position: "relative" }}>
              <Doughnut data={donutData} options={donutOpts} />
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <p className="text-lg font-bold leading-tight" style={{ color: "var(--text)" }}>{itemsNow}</p>
                <p className="text-[10px]" style={{ color: "var(--text-muted)" }}>itens</p>
              </div>
            </div>
            <ul className="flex-1 w-full space-y-1.5">
              {topProds.map((p, i) => (
                <li key={p.id} className="flex items-center justify-between text-xs">
                  <span className="flex items-center gap-1.5 min-w-0">
                    <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: DONUT_COLORS[i] }} />
                    <span className="truncate" style={{ color: "var(--text-secondary)" }}>{p.name}</span>
                  </span>
                  <span className="font-semibold ml-2" style={{ color: "var(--text)" }}>{p.pct}%</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── section: Pedidos ──────────────────────────────────────────────────────────

function PedidosSection({ orders, prevOrders, isDark }) {
  const chartText = isDark ? "#9ca3af" : "#64748b";
  const chartGrid = isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)";

  const statusMap     = countByStatus(orders);
  const prevStatusMap = countByStatus(prevOrders);

  const tableOrders    = orders.filter(o => o.service_type === "Table").length;
  const takeawayOrders = orders.filter(o => o.service_type === "Takeaway").length;

  const statusKeys = Object.keys({ ...statusMap, ...prevStatusMap });
  const barData = {
    labels: statusKeys.map(k => STATUS_LABELS[k] ?? k),
    datasets: [{
      data: statusKeys.map(k => statusMap[k] || 0),
      backgroundColor: statusKeys.map(k => BAR_STATUS_COLORS[k] ?? "#9ca3af"),
      borderRadius: 6,
    }],
  };
  const barOpts = {
    responsive: true, maintainAspectRatio: false,
    plugins: { legend: { display: false } },
    scales: {
      x: { ticks: { color: chartText, font: { size: 10 } }, grid: { color: chartGrid } },
      y: { ticks: { color: chartText, font: { size: 10 } }, grid: { color: chartGrid }, min: 0 },
    },
  };

  const typeData = {
    labels: ["Mesa", "Takeaway"],
    datasets: [{
      data: [tableOrders, takeawayOrders],
      backgroundColor: ["#6366f1", "#f59e0b"],
      borderWidth: 2,
      borderColor: isDark ? "#111" : "#fff",
    }],
  };
  const typeOpts = { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, cutout: "62%" };

  if (!orders.length) return <SectionEmpty />;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <KpiTile label="Total pedidos" value={orders.length} pct={pctChange(orders.length, prevOrders.length)} up={orders.length >= prevOrders.length} />
        <KpiTile label="Novos" value={statusMap.Pending ?? 0} pct={null} up={null} />
        <KpiTile label="Em preparação" value={statusMap["In Preparation"] ?? 0} pct={null} up={null} />
        <KpiTile label="Concluídos" value={(statusMap.Done ?? 0) + (statusMap.Delivered ?? 0)} pct={null} up={null} />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 rounded-[16px] bg-[var(--surface-2)] p-4">
          <h4 className="text-sm font-semibold mb-3" style={{ color: "var(--text)" }}>Pedidos por estado</h4>
          <div style={{ height: 200 }}><Bar data={barData} options={barOpts} /></div>
        </div>
        <div className="rounded-[16px] bg-[var(--surface-2)] p-4">
          <h4 className="text-sm font-semibold mb-3" style={{ color: "var(--text)" }}>Tipo de serviço</h4>
          <div className="flex flex-col items-center gap-4">
            <div style={{ width: 130, height: 130 }}>
              <Doughnut data={typeData} options={typeOpts} />
            </div>
            <ul className="w-full space-y-1.5">
              {[["Mesa", "#6366f1", tableOrders], ["Takeaway", "#f59e0b", takeawayOrders]].map(([label, color, count]) => (
                <li key={label} className="flex items-center justify-between text-xs">
                  <span className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full" style={{ background: color }} />
                    <span style={{ color: "var(--text-secondary)" }}>{label}</span>
                  </span>
                  <span className="font-semibold" style={{ color: "var(--text)" }}>{count}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── section: Produtos ─────────────────────────────────────────────────────────

function ProdutosSection({ orderItems, orders, itemMap, isDark }) {
  const chartText = isDark ? "#9ca3af" : "#64748b";
  const chartGrid = isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)";

  const periodOrderIds = useMemo(() => new Set(orders.map(o => o.id)), [orders]);
  const periodItems    = useMemo(() => orderItems.filter(oi => periodOrderIds.has(oi.order_id)), [orderItems, periodOrderIds]);
  const ranking        = useMemo(() => getProductRevenue(periodItems, itemMap).slice(0, 10), [periodItems, itemMap]);

  const barData = {
    labels: ranking.map(p => p.name),
    datasets: [{
      label: "Receita (€)",
      data: ranking.map(p => p.revenue),
      backgroundColor: "#6366f1",
      borderRadius: 4,
    }],
  };
  const barOpts = {
    indexAxis: "y",
    responsive: true, maintainAspectRatio: false,
    plugins: { legend: { display: false }, tooltip: { callbacks: { label: c => `€${c.raw.toFixed(2)}` } } },
    scales: {
      x: { ticks: { color: chartText, font: { size: 10 } }, grid: { color: chartGrid } },
      y: { ticks: { color: chartText, font: { size: 10 } } },
    },
  };

  if (!periodItems.length) return <SectionEmpty />;

  return (
    <div className="space-y-6">
      <div className="rounded-[16px] bg-[var(--surface-2)] p-4">
        <h4 className="text-sm font-semibold mb-3" style={{ color: "var(--text)" }}>Top produtos por receita</h4>
        <div style={{ height: Math.max(200, ranking.length * 30) }}>
          <Bar data={barData} options={barOpts} />
        </div>
      </div>
      <div className="rounded-[16px] bg-[var(--surface-2)] p-4 overflow-x-auto">
        <h4 className="text-sm font-semibold mb-3" style={{ color: "var(--text)" }}>Ranking detalhado</h4>
        <table className="w-full text-xs">
          <thead>
            <tr style={{ borderBottom: "1px solid var(--border)" }}>
              {["#", "Produto", "Qtd vendida", "Receita"].map(h => (
                <th key={h} className="pb-2 text-left pr-4 font-semibold" style={{ color: "var(--text-muted)" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {ranking.map((p, i) => (
              <tr key={p.name} style={{ borderBottom: "1px solid var(--border)" }}>
                <td className="py-2 pr-4 font-semibold" style={{ color: "var(--primary)" }}>{i + 1}</td>
                <td className="py-2 pr-4" style={{ color: "var(--text)" }}>{p.name}</td>
                <td className="py-2 pr-4" style={{ color: "var(--text)" }}>{p.qty}</td>
                <td className="py-2 font-semibold" style={{ color: "var(--text)" }}>{fmtEur(p.revenue)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── section: Mesas ────────────────────────────────────────────────────────────

function MesasSection({ tables, orders }) {
  const occupied  = tables.filter(t => t.status === "Occupied").length;
  const reserved  = tables.filter(t => t.status === "Reserved").length;
  const available = tables.filter(t => t.status === "Available").length;
  const tableOrders = orders.filter(o => o.table_id);

  // Orders per table
  const perTable = {};
  tableOrders.forEach(o => { perTable[o.table_id] = (perTable[o.table_id] || 0) + 1; });
  const topTables = Object.entries(perTable).sort(([,a],[,b]) => b-a).slice(0, 5);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <KpiTile label="Total mesas" value={tables.length} pct={null} up={null} />
        <KpiTile label="Ocupadas" value={occupied} pct={null} up={null} />
        <KpiTile label="Reservadas" value={reserved} pct={null} up={null} />
        <KpiTile label="Disponíveis" value={available} pct={null} up={null} />
      </div>
      {topTables.length > 0 && (
        <div className="rounded-[16px] bg-[var(--surface-2)] p-4 overflow-x-auto">
          <h4 className="text-sm font-semibold mb-3" style={{ color: "var(--text)" }}>Mesas com mais pedidos</h4>
          <table className="w-full text-xs">
            <thead>
              <tr style={{ borderBottom: "1px solid var(--border)" }}>
                {["Mesa", "Pedidos"].map(h => (
                  <th key={h} className="pb-2 text-left pr-4 font-semibold" style={{ color: "var(--text-muted)" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {topTables.map(([tableId, count]) => (
                <tr key={tableId} style={{ borderBottom: "1px solid var(--border)" }}>
                  <td className="py-2 pr-4" style={{ color: "var(--text)" }}>Mesa {tableId}</td>
                  <td className="py-2 font-semibold" style={{ color: "var(--primary)" }}>{count}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ── section: Clientes ─────────────────────────────────────────────────────────

function ClientesSection({ customers, orders }) {
  const active = customers.filter(c => c.active !== false).length;

  const perCustomer = {};
  orders.forEach(o => {
    if (o.customer_id) {
      perCustomer[o.customer_id] = (perCustomer[o.customer_id] || 0) + 1;
    }
  });
  const topCustomers = Object.entries(perCustomer)
    .sort(([,a],[,b]) => b-a)
    .slice(0, 5)
    .map(([id, count]) => {
      const c = customers.find(c => c.id === Number(id));
      return { name: c?.name ?? `Cliente ${id}`, count };
    });

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3">
        <KpiTile label="Total clientes" value={customers.length} pct={null} up={null} />
        <KpiTile label="Activos" value={active} pct={null} up={null} />
      </div>
      {topCustomers.length > 0 && (
        <div className="rounded-[16px] bg-[var(--surface-2)] p-4 overflow-x-auto">
          <h4 className="text-sm font-semibold mb-3" style={{ color: "var(--text)" }}>Clientes mais frequentes</h4>
          <table className="w-full text-xs">
            <thead>
              <tr style={{ borderBottom: "1px solid var(--border)" }}>
                {["#", "Cliente", "Pedidos"].map(h => (
                  <th key={h} className="pb-2 text-left pr-4 font-semibold" style={{ color: "var(--text-muted)" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {topCustomers.map((c, i) => (
                <tr key={c.name} style={{ borderBottom: "1px solid var(--border)" }}>
                  <td className="py-2 pr-4 font-semibold" style={{ color: "var(--primary)" }}>{i + 1}</td>
                  <td className="py-2 pr-4" style={{ color: "var(--text)" }}>{c.name}</td>
                  <td className="py-2 font-semibold" style={{ color: "var(--text)" }}>{c.count}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ── section: Desempenho ───────────────────────────────────────────────────────

function DesempenhoSection({ invoices, prevInvoices, orders }) {
  const totalRevenue  = invoices.reduce((s, i) => s + Number(i.total_amount    || 0), 0);
  const totalProfit   = invoices.reduce((s, i) => s + Number(i.profit_margin   || 0), 0);
  const totalTax      = invoices.reduce((s, i) => s + Number(i.tax_amount      || 0), 0);
  const prevRevenue   = prevInvoices.reduce((s, i) => s + Number(i.total_amount || 0), 0);
  const prevProfit    = prevInvoices.reduce((s, i) => s + Number(i.profit_margin || 0), 0);
  const profitMarginPct = totalRevenue > 0 ? Math.round((totalProfit / totalRevenue) * 100) : 0;

  const completedOrders = orders.filter(o =>
    (o.order_status === "Done" || o.order_status === "Delivered") && o.updated_at,
  );
  const avgTime = completedOrders.length > 0
    ? Math.round(completedOrders.reduce((s, o) =>
        s + (new Date(o.updated_at) - new Date(o.created_at)) / 60000, 0) / completedOrders.length)
    : null;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <KpiTile label="Receita total" value={fmtEur(totalRevenue)} pct={pctChange(totalRevenue, prevRevenue)} up={totalRevenue >= prevRevenue} />
        <KpiTile label="Margem de lucro" value={`${profitMarginPct}%`} pct={pctChange(totalProfit, prevProfit)} up={totalProfit >= prevProfit} />
        <KpiTile label="IVA cobrado" value={fmtEur(totalTax)} pct={null} up={null} />
        <KpiTile label="Tempo médio" value={avgTime !== null ? `${avgTime} min` : "— min"} pct={null} up={null} />
      </div>
    </div>
  );
}

// ── main ──────────────────────────────────────────────────────────────────────

export default function RelatoriosPage() {
  const { theme } = useTheme();
  const isDark = theme === "dark";

  const [section,     setSection]     = useState("vendas");
  const [period,      setPeriod]      = useState("mes");
  const [customFrom,  setCustomFrom]  = useState(THIRTY_AGO_STR);
  const [customTo,    setCustomTo]    = useState(TODAY_STR);

  // ── data queries ────────────────────────────────────────────────────────────
  const { data: invoices   = [] } = useQuery({ queryKey: ["invoices"],    queryFn: invoiceService.getAll });
  const { data: orders     = [] } = useQuery({ queryKey: ["orders"],      queryFn: orderService.getAll });
  const { data: orderItems = [] } = useQuery({ queryKey: ["order-items"], queryFn: orderItemService.getAll });
  const { data: menuItems  = [] } = useQuery({ queryKey: ["items"],       queryFn: itemService.getAll });
  const { data: tables     = [] } = useQuery({ queryKey: ["tables"],      queryFn: tableService.getAll });
  const { data: customers  = [] } = useQuery({ queryKey: ["customers"],   queryFn: customerService.getAll });

  const itemMap = useMemo(() => new Map(menuItems.map(i => [i.id, i])), [menuItems]);

  // ── period filtering ────────────────────────────────────────────────────────
  const range     = useMemo(() => getPeriodRange(period, customFrom, customTo), [period, customFrom, customTo]);
  const prevRange = useMemo(() => getPrevRange(range.from, range.to), [range]);

  const periodInvoices  = useMemo(() => filterByRange(invoices, "issued_at",  range.from, range.to), [invoices, range]);
  const prevInvoices    = useMemo(() => filterByRange(invoices, "issued_at",  prevRange.from, prevRange.to), [invoices, prevRange]);
  const periodOrders    = useMemo(() => filterByRange(orders,   "created_at", range.from, range.to), [orders, range]);
  const prevOrders      = useMemo(() => filterByRange(orders,   "created_at", prevRange.from, prevRange.to), [orders, prevRange]);

  // ── input style ─────────────────────────────────────────────────────────────
  const inputStyle = {
    background: "var(--surface-2)", border: "1px solid var(--border)",
    borderRadius: 8, padding: "5px 9px", fontSize: 12, color: "var(--text)",
    outline: "none", colorScheme: isDark ? "dark" : "light",
  };

  const activeSection = REPORT_SECTIONS.find(s => s.key === section);

  return (
    <PageSection title="Relatórios" description="Métricas e análises do restaurante">
      <div className="flex flex-col lg:flex-row gap-6">

        {/* ── Sidebar (desktop) / Tabs (mobile) ── */}
        <aside className="lg:w-44 flex-shrink-0">
          {/* Mobile: ícones em linha sem overflow */}
          <div className="flex lg:hidden gap-2 mb-2 justify-between">
            {REPORT_SECTIONS.map(s => (
              <button
                key={s.key}
                onClick={() => setSection(s.key)}
                title={s.label}
                className="flex-1 flex items-center justify-center py-2 rounded-xl text-xs font-semibold transition-colors"
                style={{
                  background: section === s.key ? "var(--primary)" : "var(--surface)",
                  color: section === s.key ? "#fff" : "var(--text-muted)",
                }}
              >
                <i className={`${s.icon} text-sm`} />
              </button>
            ))}
          </div>

          {/* Desktop: vertical sidebar */}
          <nav className="hidden lg:flex flex-col gap-1">
            {REPORT_SECTIONS.map(s => (
              <button
                key={s.key}
                onClick={() => setSection(s.key)}
                className={`flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium transition-colors text-left${section !== s.key ? " hover:bg-[var(--surface-2)]" : ""}`}
                style={{
                  background: section === s.key ? "var(--primary)" : "transparent",
                  color: section === s.key ? "#fff" : "var(--text-muted)",
                }}
              >
                <i className={`${s.icon} w-4 text-center`} />
                {s.label}
              </button>
            ))}
          </nav>
        </aside>

        {/* ── Content ── */}
        <div className="flex-1 min-w-0">

          {/* Period filter */}
          <div className="flex flex-col gap-2 mb-5">
            {/* Mobile: 3 na primeira linha + Personalizado na segunda */}
            <div className="flex lg:hidden flex-col gap-2">
              <div className="flex gap-2">
                {REPORT_PERIODS.slice(0, 3).map(p => (
                  <button
                    key={p.key}
                    onClick={() => setPeriod(p.key)}
                    className="flex-1 py-2 rounded-lg text-xs font-semibold transition-colors"
                    style={{
                      background: period === p.key ? "var(--primary)" : "var(--surface)",
                      color: period === p.key ? "#fff" : "var(--text-muted)",
                      border: "1px solid var(--border)",
                    }}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
              <button
                onClick={() => setPeriod("personalizado")}
                className="w-full py-2 rounded-lg text-xs font-semibold transition-colors"
                style={{
                  background: period === "personalizado" ? "var(--primary)" : "var(--surface)",
                  color: period === "personalizado" ? "#fff" : "var(--text-muted)",
                  border: "1px solid var(--border)",
                }}
              >
                Personalizado
              </button>
            </div>
            {/* Desktop: linha única */}
            <div className="hidden lg:flex gap-2">
              {REPORT_PERIODS.map(p => (
                <button
                  key={p.key}
                  onClick={() => setPeriod(p.key)}
                  className="px-4 py-2 rounded-lg text-xs font-semibold transition-colors flex-shrink-0 whitespace-nowrap"
                  style={{
                    background: period === p.key ? "var(--primary)" : "var(--surface)",
                    color: period === p.key ? "#fff" : "var(--text-muted)",
                    border: "1px solid var(--border)",
                  }}
                >
                  {p.label}
                </button>
              ))}
            </div>
            {period === "personalizado" && (
              <div className="flex items-center gap-2 flex-wrap">
                <input type="date" value={customFrom} onChange={e => setCustomFrom(e.target.value)} style={inputStyle} />
                <span className="text-xs" style={{ color: "var(--text-muted)" }}>até</span>
                <input type="date" value={customTo} onChange={e => setCustomTo(e.target.value)} style={inputStyle} />
              </div>
            )}
          </div>

          {/* Section title */}
          <div className="flex items-center gap-2 mb-4">
            <i className={`${activeSection?.icon} text-sm`} style={{ color: "var(--primary)" }} />
            <h3 className="font-bold text-base" style={{ color: "var(--text)" }}>{activeSection?.label}</h3>
          </div>

          {/* Section content */}
          {section === "vendas" && (
            <VendasSection
              invoices={periodInvoices} prevInvoices={prevInvoices}
              orders={periodOrders} prevOrders={prevOrders}
              orderItems={orderItems} itemMap={itemMap}
              range={range} isDark={isDark}
            />
          )}
          {section === "pedidos" && (
            <PedidosSection orders={periodOrders} prevOrders={prevOrders} isDark={isDark} />
          )}
          {section === "produtos" && (
            <ProdutosSection orderItems={orderItems} orders={periodOrders} itemMap={itemMap} isDark={isDark} />
          )}
          {section === "mesas" && (
            <MesasSection tables={tables} orders={periodOrders} />
          )}
          {section === "clientes" && (
            <ClientesSection customers={customers} orders={periodOrders} />
          )}
          {section === "desempenho" && (
            <DesempenhoSection invoices={periodInvoices} prevInvoices={prevInvoices} orders={periodOrders} />
          )}

        </div>
      </div>
    </PageSection>
  );
}
