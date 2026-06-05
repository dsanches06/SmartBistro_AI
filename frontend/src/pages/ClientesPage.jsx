import { useState, useEffect } from "react";
import { useSearchParams } from "react-router";
import { Chart as ChartJS, ArcElement, CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Legend, Filler } from "chart.js";
import { Doughnut, Line } from "react-chartjs-2";
import { customerService }  from "@/services/customerService.js";
import { orderService }     from "@/services/orderService.js";
import { invoiceService }   from "@/services/invoiceService.js";
import { orderItemService } from "@/services/orderItemService.js";
import { itemService }      from "@/services/itemService.js";
import TrophySpin from "@/components/ui/TrophySpin";
import CustomerCard, { getPalette, getInitials, formatDate } from "@/components/customers/CustomerCard.jsx";
import { useAuth } from "@/context/AuthContext";
import { CAT_COLORS, CAT_FALLBACK } from "@/utils/menuUtils";
import { ORDER_STATUS_STYLE, ORDERS_PER_PAGE, NOTIFS_PER_PAGE } from "@/utils/orderUtils";
import { fmtEur } from "@/utils/dashboardUtils";

ChartJS.register(ArcElement, CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Legend, Filler);

// ── Stat card (filterable) ─────────────────────────────────────────────────────
function FilterStatCard({ label, value, icon, filter, currentFilter, onFilter }) {
  const isSelected = filter && currentFilter === filter;
  return (
    <button
      type="button"
      onClick={() => filter && onFilter(filter)}
      className={[
        "flex items-center gap-3 rounded-2xl sm:rounded-3xl p-2 text-left transition-all",
        filter ? "cursor-pointer hover:bg-surface-2 active:scale-95" : "cursor-default",
        isSelected ? "bg-surface-2 border border-surface" : "bg-surface",
      ].join(" ")}
    >
      <span className="w-8 h-8 rounded-full flex items-center justify-center text-base flex-shrink-0 bg-surface-2 text-[var(--primary)]">
        <i className={icon} aria-hidden="true" />
      </span>
      <div className="min-w-0">
        <p className="text-[10px] text-muted uppercase tracking-[0.06em] leading-tight">{label}</p>
        <p className="text-base font-semibold text-main">{value}</p>
      </div>
    </button>
  );
}

// ── Delete confirmation modal ──────────────────────────────────────────────────
function DeleteConfirm({ customer, onCancel, onConfirm }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-surface rounded-2xl p-6 max-w-sm w-full shadow-2xl border border-surface animate-fadeInUp">
        <h3 className="text-base font-semibold text-main mb-2">Remover cliente</h3>
        <p className="text-sm text-muted mb-5">
          Tem a certeza que deseja remover{" "}
          <span className="font-semibold text-main">{customer.name}</span>? Esta ação não pode ser
          desfeita.
        </p>
        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 text-sm rounded-lg border border-surface bg-surface-2 text-muted hover:bg-surface transition-colors cursor-pointer"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="px-4 py-2 text-sm rounded-lg bg-[#B91C1C] text-white hover:bg-[#991B1B] transition-colors cursor-pointer"
          >
            Remover
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Create customer modal ──────────────────────────────────────────────────────
function NovoClienteModal({ onClose, onCreate }) {
  const [form, setForm] = useState({ name: "", phone: "" });
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) return setErr("Nome obrigatório.");
    setSaving(true); setErr("");
    try {
      const created = await customerService.create({ name: form.name.trim(), phone: form.phone.trim() || null });
      onCreate(created);
      onClose();
    } catch { setErr("Erro ao criar cliente. Nome ou telefone já podem existir."); }
    finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.5)" }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="rounded-[24px] p-6 w-full max-w-sm shadow-2xl"
        style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-bold" style={{ color: "var(--text)" }}>Novo Cliente</h2>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-xl"
            style={{ background: "var(--surface-2)", color: "var(--text-muted)" }}>
            <i className="fa-solid fa-xmark text-sm" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <label className="block text-xs font-semibold mb-1" style={{ color: "var(--text-secondary)" }}>Nome *</label>
            <input type="text" value={form.name} onChange={e => set("name", e.target.value)}
              placeholder="Ex: João Silva"
              className="w-full rounded-xl px-3 py-2 text-sm outline-none"
              style={{ background: "var(--surface-2)", border: "1px solid var(--border)", color: "var(--text)" }} />
          </div>
          <div>
            <label className="block text-xs font-semibold mb-1" style={{ color: "var(--text-secondary)" }}>Telefone</label>
            <input type="tel" value={form.phone} onChange={e => set("phone", e.target.value)}
              placeholder="Ex: 912345678"
              className="w-full rounded-xl px-3 py-2 text-sm outline-none"
              style={{ background: "var(--surface-2)", border: "1px solid var(--border)", color: "var(--text)" }} />
          </div>
          {err && <p className="text-xs text-red-500">{err}</p>}
          <div className="flex gap-2 pt-1">
            <button type="button" onClick={onClose}
              className="flex-1 py-2 rounded-xl text-sm font-semibold"
              style={{ background: "var(--surface-2)", color: "var(--text-secondary)" }}>
              Cancelar
            </button>
            <button type="submit" disabled={saving}
              className="flex-1 py-2 rounded-xl text-sm font-semibold text-white disabled:opacity-60"
              style={{ background: "var(--primary)" }}>
              {saving ? <i className="fa-solid fa-spinner fa-spin" /> : "Criar Cliente"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

const fmt = (v) => fmtEur(v ?? null);

// ── Customer detail panel ──────────────────────────────────────────────────────
function CustomerDetail({ customer, onBack }) {
  const c = getPalette(customer.id);

  const [notifications, setNotifications] = useState([]);
  const [loadingNotifs, setLoadingNotifs] = useState(true);
  const [markingId,     setMarkingId]     = useState(null);

  const [orders,        setOrders]        = useState([]);
  const [invoiceMap,    setInvoiceMap]    = useState({});
  const [loadingOrders, setLoadingOrders] = useState(true);
  const [orderPage,     setOrderPage]     = useState(1);
  const [notifPage,     setNotifPage]     = useState(1);

  const [categoryData,  setCategoryData]  = useState({});
  const [loadingCharts, setLoadingCharts] = useState(true);

  useEffect(() => {
    let cancelled = false;

    customerService.getNotifications(customer.id)
      .then((d) => { if (!cancelled) setNotifications(Array.isArray(d) ? d : []); })
      .catch(() => { if (!cancelled) setNotifications([]); })
      .finally(() => { if (!cancelled) setLoadingNotifs(false); });

    // orders → invoices → order items → category breakdown
    Promise.all([
      orderService.getByCustomer(customer.id).catch(() => []),
      itemService.getAll().catch(() => []),
    ]).then(async ([orderList, allItems]) => {
      if (cancelled) return;
      const rows    = Array.isArray(orderList) ? orderList : [];
      const itemMap = Object.fromEntries((Array.isArray(allItems) ? allItems : []).map((i) => [i.id, i]));
      setOrders(rows);

      const [invoicePairs, orderItemsPairs] = await Promise.all([
        Promise.all(rows.map((o) =>
          invoiceService.getByOrder(o.id).then((inv) => [o.id, inv]).catch(() => [o.id, null])
        )),
        Promise.all(rows.map((o) =>
          orderItemService.getByOrder(o.id).then((items) => [o.id, items]).catch(() => [o.id, []])
        )),
      ]);

      if (cancelled) return;
      setInvoiceMap(Object.fromEntries(invoicePairs));

      // Gastos por categoria — com fallback para kitchen_sequence_json
      const itemByName = Object.fromEntries(
        Object.values(itemMap).map(i => [i.name?.toLowerCase(), i])
      );
      const catTotals = {};
      orderItemsPairs.forEach(([orderId, items]) => {
        if (Array.isArray(items) && items.length > 0) {
          items.forEach((oi) => {
            const item = itemMap[oi.item_id];
            if (!item) return;
            const cat = item.category || "Other";
            catTotals[cat] = (catTotals[cat] || 0) + Number(item.price) * Number(oi.quantity);
          });
        } else {
          // Fallback: pedidos do carrinho sem order_items na DB
          const order = rows.find(o => String(o.id) === String(orderId));
          let kItems = [];
          try {
            const raw = typeof order?.kitchen_sequence_json === 'string'
              ? JSON.parse(order.kitchen_sequence_json)
              : order?.kitchen_sequence_json;
            kItems = Array.isArray(raw) ? raw : [];
          } catch { kItems = []; }
          kItems.forEach(ki => {
            if (typeof ki !== 'object' || !ki.name) return;
            const found = itemByName[ki.name?.toLowerCase()];
            if (!found) return;
            const cat = found.category || "Other";
            catTotals[cat] = (catTotals[cat] || 0) + Number(ki.price || found.price) * Number(ki.quantity || 1);
          });
        }
      });
      setCategoryData(catTotals);
    }).finally(() => {
      if (!cancelled) { setLoadingOrders(false); setLoadingCharts(false); }
    });

    return () => { cancelled = true; };
  }, [customer.id]);

  async function markRead(notifId) {
    if (markingId) return;
    setMarkingId(notifId);
    try {
      await customerService.markNotificationRead(customer.id, notifId);
      setNotifications((prev) => prev.map((n) => (n.id === notifId ? { ...n, is_read: true } : n)));
    } catch {/* silent */} finally { setMarkingId(null); }
  }

  const unread     = notifications.filter((n) => !n.is_read).length;
  const totalSpent = orders.reduce((sum, o) => {
    const inv = invoiceMap[o.id];
    return sum + (inv?.total_amount ? Number(inv.total_amount) : 0);
  }, 0);

  // orders pagination
  const totalPages    = Math.max(1, Math.ceil(orders.length / ORDERS_PER_PAGE));
  const pagedOrders   = orders.slice((orderPage - 1) * ORDERS_PER_PAGE, orderPage * ORDERS_PER_PAGE);

  // notifications pagination
  const notifTotal  = Math.max(1, Math.ceil(notifications.length / NOTIFS_PER_PAGE));
  const pagedNotifs = notifications.slice((notifPage - 1) * NOTIFS_PER_PAGE, notifPage * NOTIFS_PER_PAGE);

  // chart data
  const catLabels  = Object.keys(categoryData);
  const catValues  = catLabels.map((k) => +categoryData[k].toFixed(2));
  const catBgs     = catLabels.map((k) => (CAT_COLORS[k] || CAT_FALLBACK).bg);
  const catBorders = catLabels.map((k) => (CAT_COLORS[k] || CAT_FALLBACK).border);

  const doughnutData = {
    labels: catLabels,
    datasets: [{ data: catValues, backgroundColor: catBgs, borderColor: catBorders, borderWidth: 2 }],
  };
  const lineData = {
    labels: catLabels,
    datasets: [{
      label: "Gasto (€)",
      data: catValues,
      backgroundColor: "rgba(99,102,241,0.15)",
      borderColor: "#6366F1",
      borderWidth: 2,
      pointBackgroundColor: catBorders,
      pointBorderColor: "#fff",
      pointBorderWidth: 2,
      pointRadius: 6,
      tension: 0.4,
      fill: true,
    }],
  };
  const chartTextColor = "rgba(150,150,170,0.9)";
  const doughnutOpts = {
    responsive: true,
    plugins: {
      legend: { position: "bottom", labels: { color: chartTextColor, font: { size: 11 }, padding: 12 } },
      tooltip: { callbacks: { label: (ctx) => ` ${ctx.label}: ${fmt(ctx.parsed)}` } },
    },
  };
  const lineOpts = {
    responsive: true,
    plugins: {
      legend: { display: false },
      tooltip: { callbacks: { label: (ctx) => ` ${fmt(ctx.parsed.y)}` } },
    },
    scales: {
      x: { ticks: { color: chartTextColor, font: { size: 11 } }, grid: { display: false } },
      y: { ticks: { color: chartTextColor, font: { size: 11 }, callback: (v) => `${v} €` }, grid: { color: "rgba(150,150,170,0.1)" } },
    },
  };

  return (
    <div className="w-full max-w-[1200px] mx-auto px-4 sm:px-6 py-4 sm:py-6 animate-fadeInUp space-y-4">

      {/* ── Header ── */}
      <div className="flex items-center gap-3">
        {/* Esquerda: avatar + nome + badge */}
        <div className="flex items-center gap-2.5 flex-1 min-w-0">
          <div className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-semibold flex-shrink-0" style={{ background: c.bg, color: c.tx }}>
            {getInitials(customer.name)}
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-3 flex-wrap">
              <p className="text-sm font-bold text-main leading-tight">{customer.name}</p>
              <span className={`text-xs px-2.5 py-0.5 rounded-full font-semibold ${customer.active ? "bg-[#EAF3DE] text-[#3B6D11]" : "bg-[#FCEBEB] text-[#A32D2D]"}`}>
                {customer.active ? "Ativo" : "Inativo"}
              </span>
            </div>
            <p className="text-[11px] text-muted">{customer.phone || "sem telefone"}</p>
          </div>
        </div>

        {/* Direita: botão Voltar */}
        <button onClick={onBack} className="flex-shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer hover:border-[var(--primary)]"
          style={{ background: "var(--surface-2)", color: "var(--text-secondary)", border: "1px solid var(--border)" }}>
          <i className="fa-solid fa-arrow-left text-[10px]" /> Voltar
        </button>
      </div>

      {/* ── Info card ── */}
      <div className="rounded-2xl bg-surface border border-surface p-5 shadow-sm">
        <h3 className="text-sm font-semibold text-main mb-3">Informação do cliente</h3>
        <ul className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
          {[
            { label: "ID",          value: `#${customer.id}` },
            { label: "Telefone",    value: customer.phone || "—" },
            { label: "Criado em",   value: formatDate(customer.created_at) },
            { label: "Total gasto", value: loadingOrders ? "…" : fmt(totalSpent) },
          ].map(({ label, value }) => (
            <li key={label}>
              <p className="text-muted uppercase tracking-wide mb-0.5">{label}</p>
              <p className="font-semibold text-main">{value}</p>
            </li>
          ))}
        </ul>
      </div>

      {/* ── Notificações — só para admin/manager ── */}
      {customer.role_id === 1 && (
        <div className="rounded-2xl bg-surface border border-surface shadow-sm overflow-hidden flex flex-col">
          <div className="flex items-center gap-2 px-5 py-3 border-b border-surface">
            <i className="fas fa-bell text-sm text-muted" />
            <h3 className="text-sm font-semibold text-main flex-1">Notificações</h3>
            {notifications.filter(n => !n.is_read).length > 0 && (
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#ef4444] text-white">
                {notifications.filter(n => !n.is_read).length} não {notifications.filter(n => !n.is_read).length === 1 ? "lida" : "lidas"}
              </span>
            )}
          </div>
          <div className="divide-y divide-surface flex-1">
            {loadingNotifs ? (
              <p className="text-center py-8 text-muted text-sm">A carregar…</p>
            ) : notifications.length === 0 ? (
              <p className="text-center py-8 text-muted text-sm">Sem notificações.</p>
            ) : notifications.slice((notifPage - 1) * NOTIFS_PER_PAGE, notifPage * NOTIFS_PER_PAGE).map((n) => (
              <div key={n.id} onClick={() => !n.is_read && markRead(n.id)}
                className={`flex gap-3 px-5 py-3 transition-colors ${n.is_read ? "opacity-50 cursor-default" : "cursor-pointer hover:bg-surface-2"}`}>
                <span className={`w-2 h-2 rounded-full flex-shrink-0 mt-1.5 ${n.is_read ? "bg-transparent" : "bg-[#ef4444]"}`} />
                <div className="min-w-0 flex-1">
                  <p className={`text-sm leading-snug ${n.is_read ? "font-normal text-muted" : "font-semibold text-main"}`}>{n.title || "Notificação"}</p>
                  {n.message && <p className="text-xs text-muted mt-0.5 line-clamp-2">{n.message}</p>}
                </div>
                {!n.is_read && <span className="text-[10px] text-muted self-start mt-1 flex-shrink-0">{markingId === n.id ? "…" : "marcar lida"}</span>}
              </div>
            ))}
          </div>
          {Math.ceil(notifications.length / NOTIFS_PER_PAGE) > 1 && (
            <div className="flex items-center justify-between px-5 py-2 border-t border-surface">
              <button disabled={notifPage === 1} onClick={() => setNotifPage(p => p - 1)}
                className="text-xs text-muted disabled:opacity-30 hover:text-main transition-colors cursor-pointer disabled:cursor-default">
                ← Anterior
              </button>
              <span className="text-xs text-muted">{notifPage} / {Math.ceil(notifications.length / NOTIFS_PER_PAGE)}</span>
              <button disabled={notifPage === Math.ceil(notifications.length / NOTIFS_PER_PAGE)} onClick={() => setNotifPage(p => p + 1)}
                className="text-xs text-muted disabled:opacity-30 hover:text-main transition-colors cursor-pointer disabled:cursor-default">
                Próxima →
              </button>
            </div>
          )}
        </div>
      )}

      {/* ── Row 1: Histórico — só para clientes normais ── */}
      {customer.role_id !== 1 && (
      <div className="grid grid-cols-1 gap-4">

        {/* Histórico de ordens com paginação */}
        <div className="rounded-2xl bg-surface border border-surface shadow-sm overflow-hidden flex flex-col">
          <div className="flex items-center gap-2 px-5 py-3 border-b border-surface">
            <i className="fas fa-receipt text-sm text-muted" />
            <h3 className="text-sm font-semibold text-main flex-1">Histórico de ordens</h3>
            <span className="text-[10px] text-muted">{orders.length} pedido{orders.length !== 1 ? "s" : ""}</span>
          </div>
          <div className="flex-1 overflow-hidden">
            {loadingOrders ? (
              <p className="text-center py-8 text-muted text-sm">A carregar…</p>
            ) : orders.length === 0 ? (
              <p className="text-center py-8 text-muted text-sm">Sem pedidos registados.</p>
            ) : (
              <>
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-surface">
                      <th className="text-left px-5 py-2 text-muted font-medium">Data</th>
                      <th className="text-left px-3 py-2 text-muted font-medium">Estado</th>
                      <th className="text-left px-3 py-2 text-muted font-medium">Tipo</th>
                      <th className="text-right px-5 py-2 text-muted font-medium">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-surface">
                    {pagedOrders.map((o) => {
                      const inv = invoiceMap[o.id];
                      const st  = ORDER_STATUS_STYLE[o.order_status] || { bg: "#F3F4F6", tx: "#6B7280" };
                      return (
                        <tr key={o.id} className="hover:bg-surface-2 transition-colors">
                          <td className="px-5 py-2.5 text-muted whitespace-nowrap">{formatDate(o.created_at)}</td>
                          <td className="px-3 py-2.5">
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold" style={{ backgroundColor: st.bg, color: st.tx }}>
                              {o.order_status}
                            </span>
                          </td>
                          <td className="px-3 py-2.5 text-muted">{o.service_type || "—"}</td>
                          <td className="px-5 py-2.5 text-right font-semibold text-main">{inv ? fmt(inv.total_amount) : "—"}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot>
                    <tr className="border-t-2 border-surface">
                      <td colSpan={3} className="px-5 py-2.5 text-xs font-semibold text-muted">Total gasto</td>
                      <td className="px-5 py-2.5 text-right text-sm font-bold text-main">{fmt(totalSpent)}</td>
                    </tr>
                  </tfoot>
                </table>
                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="flex items-center justify-between px-5 py-2 border-t border-surface">
                    <button
                      disabled={orderPage === 1}
                      onClick={() => setOrderPage((p) => p - 1)}
                      className="text-xs text-muted disabled:opacity-30 hover:text-main transition-colors cursor-pointer disabled:cursor-default"
                    >
                      ← Anterior
                    </button>
                    <span className="text-xs text-muted">{orderPage} / {totalPages}</span>
                    <button
                      disabled={orderPage === totalPages}
                      onClick={() => setOrderPage((p) => p + 1)}
                      className="text-xs text-muted disabled:opacity-30 hover:text-main transition-colors cursor-pointer disabled:cursor-default"
                    >
                      Próxima →
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
      )}

      {/* ── Row 2: Charts — só para clientes normais ── */}
      {customer.role_id !== 1 && (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

        {/* Doughnut */}
        <div className="rounded-2xl bg-surface border border-surface shadow-sm p-5">
          <h3 className="text-sm font-semibold text-main mb-4">
            <i className="fas fa-chart-pie text-muted mr-2" />
            Gastos por categoria
          </h3>
          {loadingCharts ? (
            <p className="text-center py-8 text-muted text-sm">A carregar…</p>
          ) : catLabels.length === 0 ? (
            <p className="text-center py-8 text-muted text-sm">Sem dados suficientes.</p>
          ) : (
            <div className="flex justify-center" style={{ maxHeight: 260 }}>
              <Doughnut data={doughnutData} options={doughnutOpts} />
            </div>
          )}
        </div>

        {/* Line */}
        <div className="rounded-2xl bg-surface border border-surface shadow-sm p-5">
          <h3 className="text-sm font-semibold text-main mb-4">
            <i className="fas fa-chart-line text-muted mr-2" />
            Valor por categoria (€)
          </h3>
          {loadingCharts ? (
            <p className="text-center py-8 text-muted text-sm">A carregar…</p>
          ) : catLabels.length === 0 ? (
            <p className="text-center py-8 text-muted text-sm">Sem dados suficientes.</p>
          ) : (
            <div style={{ maxHeight: 260 }}>
              <Line data={lineData} options={lineOpts} />
            </div>
          )}
        </div>

      </div>
      )}
    </div>
  );
}

// ── Main page ──────────────────────────────────────────────────────────────────
export default function ClientesPage() {
  const { user } = useAuth();
  const isAdmin = user?.role_id === 1;
  const [searchParams] = useSearchParams();
  const [customers,          setCustomers]          = useState([]);
  const [loading,            setLoading]            = useState(true);
  const [error,              setError]              = useState(null);
  const [search,             setSearch]             = useState("");
  const [showSearch,         setShowSearch]         = useState(false);
  const [statusFilter,       setStatusFilter]       = useState("ALL");
  const [sortDirection,      setSortDirection]      = useState("NONE");
  const [activeDetail,       setActiveDetail]       = useState(null);
  const [confirmDeleteId,    setConfirmDeleteId]    = useState(null);
  const [showCreateCliente,  setShowCreateCliente]  = useState(false);

  const loadCustomers = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await customerService.getAll();
      setCustomers(
        data.map((c) => ({ ...c, active: c.active === true || c.active === 1 }))
      );
    } catch (err) {
      setError(err.message || "Falha ao conectar ao servidor");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadCustomers(); }, []);

  // Abre automaticamente o detail do admin quando ?open=id está presente
  useEffect(() => {
    const openId = Number(searchParams.get("open"));
    if (!openId || !customers.length) return;
    const target = customers.find(c => c.id === openId);
    if (target) setActiveDetail(target);
  }, [searchParams, customers]);

  // ── Derivations ──
  const filtered = customers.filter((c) => {
    const q = search.toLowerCase();
    const matchesText =
      c.name.toLowerCase().includes(q) ||
      (c.phone || "").toLowerCase().includes(q);
    const matchesStatus =
      statusFilter === "ALL"      ? true :
      statusFilter === "ACTIVE"   ? c.active :
      statusFilter === "INACTIVE" ? !c.active : true;
    return matchesText && matchesStatus;
  });

  const sorted = [...filtered].sort((a, b) => {
    if (sortDirection === "ASC")  return a.name.localeCompare(b.name);
    if (sortDirection === "DESC") return b.name.localeCompare(a.name);
    return 0;
  });

  const activeCount   = customers.filter((c) => c.active).length;
  const inactiveCount = customers.filter((c) => !c.active).length;
  const activePct     = customers.length > 0
    ? ((activeCount / customers.length) * 100).toFixed(1)
    : "0.0";

  const statCards = [
    { label: "Clientes",  value: customers.length,  icon: "fas fa-users",        filter: "ALL"      },
    { label: "Ativos",    value: activeCount,        icon: "fas fa-user-check",   filter: "ACTIVE"   },
    { label: "Inativos",  value: inactiveCount,      icon: "fas fa-user-slash",   filter: "INACTIVE" },
    { label: "Filtrados", value: filtered.length,    icon: "fas fa-filter",       filter: null       },
    { label: "Ativos %",  value: `${activePct}%`,    icon: "fas fa-percentage",   filter: null       },
  ];


  async function deleteCustomer(id) {
    setCustomers((prev) => prev.filter((c) => c.id !== id));
    setConfirmDeleteId(null);
    if (activeDetail?.id === id) setActiveDetail(null);
    try {
      await customerService.remove(id);
    } catch {
      loadCustomers();
    }
  }

  // ── Loading / error states ──
  if (loading) {
    return (
      <div className="min-h-full p-6 pb-16 md:pb-6 bg-[var(--bg)] text-[var(--text)]">
        <div className="mx-auto max-w-[1200px]">
          <h2 className="text-2xl sm:text-3xl font-bold text-main mb-1">Clientes</h2>
          <p className="text-muted text-sm mb-6">Gerencie os clientes do restaurante.</p>
          <div className="flex flex-col items-center gap-4 rounded-3xl border border-surface bg-surface p-6 text-center max-w-md mx-auto">
            <TrophySpin message="A carregar clientes..." />
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-full p-6 pb-16 md:pb-6 bg-[var(--bg)] text-[var(--text)]">
        <div className="mx-auto max-w-[1200px]">
          <h2 className="text-2xl sm:text-3xl font-bold text-main mb-6">Clientes</h2>
          <div className="flex flex-col items-center gap-4 rounded-3xl border border-surface bg-surface p-6 text-center max-w-md mx-auto">
            <TrophySpin message="Servidor indisponível" />
            <button
              type="button"
              onClick={loadCustomers}
              className="rounded-full border border-surface bg-surface-2 px-4 py-2 text-sm font-semibold text-main cursor-pointer"
            >
              ↺ Recarregar
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── Detail view ──
  if (activeDetail) {
    const live = customers.find((c) => c.id === activeDetail.id) || activeDetail;
    return (
      <div className="min-h-full p-6 pb-16 md:pb-6 bg-[var(--bg)] text-[var(--text)]">
        <CustomerDetail customer={live} onBack={() => setActiveDetail(null)} />
      </div>
    );
  }

  const filterLabel =
    statusFilter === "ALL"      ? "Todos" :
    statusFilter === "ACTIVE"   ? "Ativos" : "Inativos";

  const confirmDeleteCustomer = confirmDeleteId !== null
    ? customers.find((c) => c.id === confirmDeleteId)
    : null;

  return (
    <div className="min-h-full p-6 pb-16 md:pb-6 bg-[var(--bg)] text-[var(--text)]">
      <div className="mx-auto max-w-[1200px] space-y-5">

        {showCreateCliente && (
          <NovoClienteModal
            onClose={() => setShowCreateCliente(false)}
            onCreate={(c) => { setCustomers(prev => [{ ...c, active: true }, ...prev]); }}
          />
        )}

        {/* ── Header ── */}
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 className="text-xl sm:text-3xl font-bold text-main mb-0.5 leading-tight">Clientes</h2>
            <p className="text-muted text-xs sm:text-sm hidden sm:block">Lista de clientes registados no restaurante.</p>
          </div>
          <button
            onClick={() => setShowCreateCliente(true)}
            className="flex items-center gap-1.5 px-3 sm:px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold text-white flex-shrink-0 whitespace-nowrap"
            style={{ background: "var(--primary)" }}
          >
            <i className="fa-solid fa-plus text-[10px] sm:text-xs" />
            <span className="hidden sm:inline">Novo</span> Cliente
          </button>
        </div>

        {/* ── Toolbar ── */}
        <div className="flex flex-col gap-3">

          {/* Mobile: ícones compactos com badge — igual às Mesas */}
          <div className="sm:hidden grid grid-cols-5 gap-2">
            {statCards.map(({ label, value, icon, filter }) => {
              const isSelected = filter && statusFilter === filter;
              const color = label === "Ativos" ? "#22c55e"
                : label === "Inativos" ? "#ef4444"
                : label === "Filtrados" ? "#3b82f6"
                : label === "Ativos %" ? "#8b5cf6"
                : "#64748b";
              return (
                <div
                  key={label}
                  onClick={() => filter && setStatusFilter(filter)}
                  className="relative flex flex-col items-center justify-center gap-1 rounded-2xl py-3"
                  style={{
                    background: isSelected ? `${color}20` : "var(--surface)",
                    border: isSelected ? `1.5px solid ${color}` : "1.5px solid transparent",
                    cursor: filter ? "pointer" : "default",
                  }}
                >
                  <i className={`${icon} text-lg`} style={{ color }} />
                  <span className="text-[9px] font-medium text-center leading-tight" style={{ color: "var(--text-muted)" }}>{label}</span>
                  <span
                    className="absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] flex items-center justify-center rounded-full text-[9px] font-bold px-1"
                    style={{ background: color, color: "#fff" }}
                  >
                    {value}
                  </span>
                </div>
              );
            })}
          </div>

          {/* Desktop: 5 in one row */}
          <div className="hidden sm:grid sm:grid-cols-5 gap-2">
            {statCards.map((c) => (
              <FilterStatCard key={c.label} {...c} currentFilter={statusFilter} onFilter={setStatusFilter} />
            ))}
          </div>

          {/* Filter controls */}
          <div className="flex items-center gap-2">
            {showSearch && (
              <input
                autoFocus
                className="flex-1 h-9 rounded-xl px-3 text-sm outline-none"
                style={{ background: "var(--surface-2)", border: "1px solid var(--border)", color: "var(--text)" }}
                placeholder="Procurar cliente…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            )}
            <div className="ml-auto flex items-center gap-2">
            <span className="hidden sm:inline-flex text-xs text-muted px-3 py-1 rounded-full border border-surface bg-surface-2">
              Filtro: {filterLabel}
            </span>
            <button
              type="button"
              onClick={() => { setShowSearch((s) => !s); setSearch(""); }}
              className="w-8 h-8 rounded-lg border flex items-center justify-center cursor-pointer transition-colors"
              style={{
                background: showSearch ? "var(--primary)" : "var(--surface)",
                borderColor: showSearch ? "var(--primary)" : "var(--border)",
                color: showSearch ? "#fff" : "var(--text-muted)",
              }}
              title={showSearch ? "Fechar pesquisa" : "Pesquisar"}
            >
              <i className={`fa-solid ${showSearch ? "fa-xmark" : "fa-magnifying-glass"} text-xs`} />
            </button>
            <button
              type="button"
              onClick={() => setSortDirection((d) => d === "NONE" ? "ASC" : d === "ASC" ? "DESC" : "NONE")}
              className="w-8 h-8 rounded-lg border border-surface bg-surface flex items-center justify-center text-muted hover:bg-surface-2 cursor-pointer"
            >
              {sortDirection === "ASC" ? "⬆" : sortDirection === "DESC" ? "⬇" : "⇅"}
            </button>
            </div>
          </div>
        </div>

        {/* ── Customer grid ── */}
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
          {sorted.map((c, i) => (
            <CustomerCard
              key={c.id}
              customer={c}
              onDetail={setActiveDetail}
              onDelete={(id) => setConfirmDeleteId(id)}
              canDelete={isAdmin}
              delay={i * 70}
            />
          ))}
          {sorted.length === 0 && (
            <p className="col-span-full text-center py-16 text-muted text-sm">
              Nenhum cliente encontrado.
            </p>
          )}
        </div>
      </div>

      {/* ── Modals ── */}
      {confirmDeleteId !== null && confirmDeleteCustomer && (
        <DeleteConfirm
          customer={confirmDeleteCustomer}
          onCancel={() => setConfirmDeleteId(null)}
          onConfirm={() => deleteCustomer(confirmDeleteId)}
        />
      )}
    </div>
  );
}
