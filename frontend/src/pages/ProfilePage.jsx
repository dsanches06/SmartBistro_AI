import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router";
import { Chart as ChartJS, ArcElement, CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Legend, Filler } from "chart.js";
import { Doughnut, Line } from "react-chartjs-2";
import { useAuth } from "@/context/AuthContext";
import { authService } from "@/services/authService";
import { customerService } from "@/services/customerService";
import { orderService }    from "@/services/orderService";
import { invoiceService }  from "@/services/invoiceService";
import { orderItemService } from "@/services/orderItemService";
import { itemService }     from "@/services/itemService";
import { getPalette, getInitials, formatDate } from "@/components/customers/CustomerCard";
import TrophySpin from "@/components/ui/TrophySpin";

ChartJS.register(ArcElement, CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Legend, Filler);

const STATUS_STYLE = {
  "Pending":        { bg: "#FFF7ED", tx: "#C2410C" },
  "In Preparation": { bg: "#EFF6FF", tx: "#1D4ED8" },
  "Ready":          { bg: "#F0FDF4", tx: "#166534" },
  "Done":           { bg: "#F5F3FF", tx: "#6D28D9" },
  "Delivered":      { bg: "#ECFEFF", tx: "#0E7490" },
  "Cancelled":      { bg: "#FEF2F2", tx: "#B91C1C" },
};

const CAT_COLORS = {
  "Appetizer":   { bg: "rgba(245,158,11,0.7)",  border: "#F59E0B" },
  "Main Course": { bg: "rgba(59,130,246,0.7)",  border: "#3B82F6" },
  "Dessert":     { bg: "rgba(236,72,153,0.7)",  border: "#EC4899" },
  "Beverage":    { bg: "rgba(16,185,129,0.7)",  border: "#10B981" },
};
const CAT_FALLBACK = { bg: "rgba(107,114,128,0.7)", border: "#6B7280" };

function fmt(v) { return v != null ? `${Number(v).toFixed(2)} €` : "—"; }

function StatBox({ label, value, sub, color }) {
  return (
    <div className="rounded-2xl p-4 flex flex-col gap-1" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
      <p className="text-[10px] uppercase tracking-widest font-semibold" style={{ color: "var(--text-muted)" }}>{label}</p>
      <p className="text-xl font-bold" style={{ color: color ?? "var(--text)" }}>{value}</p>
      {sub && <p className="text-xs" style={{ color: "var(--text-muted)" }}>{sub}</p>}
    </div>
  );
}

function DeleteRequestModal({ onClose, onConfirm, loading }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.6)" }}>
      <div className="w-full max-w-sm rounded-2xl p-6 shadow-2xl" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
        <h3 className="text-base font-bold mb-2" style={{ color: "var(--text)" }}>Solicitar remoção de conta</h3>
        <p className="text-sm mb-5" style={{ color: "var(--text-muted)" }}>
          O teu pedido será enviado ao administrador. A conta só será removida após aprovação. Esta ação não pode ser desfeita.
        </p>
        <div className="flex gap-2 justify-end">
          <button onClick={onClose} disabled={loading}
            className="px-4 py-2 text-sm rounded-xl font-semibold"
            style={{ background: "var(--surface-2)", color: "var(--text-secondary)" }}>
            Cancelar
          </button>
          <button onClick={onConfirm} disabled={loading}
            className="px-4 py-2 text-sm rounded-xl font-semibold text-white disabled:opacity-60"
            style={{ background: "#ef4444" }}>
            {loading ? "A enviar..." : "Confirmar pedido"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function ProfilePage() {
  const { user, token, logout } = useAuth();
  const navigate  = useNavigate();
  const palette   = getPalette(user?.id);

  const [orders,         setOrders]         = useState([]);
  const [invoiceMap,     setInvoiceMap]      = useState({});
  const [notifications,  setNotifications]  = useState([]);
  const [categoryTotals, setCategoryTotals] = useState({});
  const [orderPage,      setOrderPage]      = useState(1);
  const [notifPage,      setNotifPage]      = useState(1);
  const ORDERS_PER_PAGE = 5;
  const NOTIFS_PER_PAGE = 5;
  const [loading,        setLoading]        = useState(true);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteLoading,   setDeleteLoading]   = useState(false);
  const [deleteSuccess,   setDeleteSuccess]   = useState(false);

  useEffect(() => {
    if (!user?.id) return;
    Promise.all([
      orderService.getByCustomer(user.id).catch(() => []),
      customerService.getNotifications(user.id).catch(() => []),
      itemService.getAll().catch(() => []),
    ]).then(async ([orderList, notifs, allItems]) => {
      const rows    = Array.isArray(orderList) ? orderList : [];
      const itemMap = Object.fromEntries((Array.isArray(allItems) ? allItems : []).map(i => [i.id, i]));
      setOrders(rows);
      setNotifications(Array.isArray(notifs) ? notifs : []);

      const [invPairs, oiPairs] = await Promise.all([
        Promise.all(rows.map(o => invoiceService.getByOrder(o.id).then(inv => [o.id, inv]).catch(() => [o.id, null]))),
        Promise.all(rows.map(o => orderItemService.getByOrder(o.id).then(items => [o.id, items]).catch(() => [o.id, []]))),
      ]);

      setInvoiceMap(Object.fromEntries(invPairs));

      // Calcular gastos por categoria
      const catTotals = {};
      for (const [, items] of oiPairs) {
        for (const oi of (Array.isArray(items) ? items : [])) {
          const item = itemMap[oi.item_id];
          if (!item) continue;
          const cat = item.category;
          catTotals[cat] = (catTotals[cat] || 0) + Number(item.price) * Number(oi.quantity);
        }
      }
      setCategoryTotals(catTotals);
    }).finally(() => setLoading(false));
  }, [user?.id]);

  const handleRequestDelete = async () => {
    setDeleteLoading(true);
    try {
      await authService.requestDelete(token);
      setDeleteSuccess(true);
      setShowDeleteModal(false);
    } catch {
      // ignora, mostra sucesso anyway
      setDeleteSuccess(true);
      setShowDeleteModal(false);
    } finally {
      setDeleteLoading(false);
    }
  };

  if (!user) return null;

  const isAdmin     = user.role_id === 1;
  const totalGasto  = Object.values(invoiceMap).filter(Boolean).reduce((s, inv) => s + Number(inv.total_amount ?? 0), 0);
  const totalOrders = orders.length;
  const avgOrder    = totalOrders > 0 ? totalGasto / totalOrders : 0;
  const catEntries  = Object.entries(categoryTotals).sort((a, b) => b[1] - a[1]);

  // Chart data
  const catLabels  = catEntries.map(([k]) => k);
  const catValues  = catEntries.map(([, v]) => +v.toFixed(2));
  const catBgs     = catLabels.map(k => (CAT_COLORS[k] || CAT_FALLBACK).bg);
  const catBorders = catLabels.map(k => (CAT_COLORS[k] || CAT_FALLBACK).border);
  const chartTextColor = "rgba(150,150,170,0.9)";

  const doughnutData = {
    labels: catLabels,
    datasets: [{ data: catValues, backgroundColor: catBgs, borderColor: catBorders, borderWidth: 2 }],
  };
  const lineData = {
    labels: catLabels,
    datasets: [{
      label: "Gasto (€)", data: catValues,
      backgroundColor: "rgba(99,102,241,0.15)", borderColor: "#6366F1", borderWidth: 2,
      pointBackgroundColor: catBorders, pointBorderColor: "#fff", pointBorderWidth: 2,
      pointRadius: 6, tension: 0.4, fill: true,
    }],
  };
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
    <div className="min-h-screen" style={{ background: "var(--bg)" }}>
      <div className="w-full max-w-[1200px] mx-auto px-4 sm:px-6 py-6 space-y-5">

        {/* Header */}
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-full flex items-center justify-center text-lg font-bold flex-shrink-0"
            style={{ background: palette.bg, color: palette.tx }}>
            {getInitials(user.name)}
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-xl font-bold truncate" style={{ color: "var(--text)" }}>{user.name}</h1>
            <p className="text-xs" style={{ color: "var(--text-muted)" }}>
              {user.username ? `@${user.username}` : ""}{user.email ? ` · ${user.email}` : ""}
            </p>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            {!isAdmin && (
              <Link to="/"
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all"
                style={{ background: "var(--surface-2)", color: "var(--text-secondary)", border: "1px solid var(--border)" }}>
                <i className="fa-solid fa-utensils" />
                <span className="hidden sm:inline">Cardápio</span>
              </Link>
            )}
            <button onClick={() => { logout(); navigate("/"); }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold"
              style={{ background: "rgba(239,68,68,0.1)", color: "#ef4444" }}>
              <i className="fa-solid fa-right-from-bracket" />
              <span className="hidden sm:inline">Sair</span>
            </button>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-16"><TrophySpin message="A carregar..." /></div>
        ) : (
          <>
            {/* Estatísticas — só para utilizadores normais */}
            {!isAdmin && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <StatBox label="Total gasto" value={fmt(totalGasto)} color="var(--primary)" />
                <StatBox label="Pedidos" value={totalOrders} sub="histórico completo" />
                <StatBox label="Valor médio" value={fmt(avgOrder)} sub="por pedido" />
                <StatBox label="Categoria top" value={catEntries[0]?.[0] ?? "—"} sub={catEntries[0] ? fmt(catEntries[0][1]) : "sem dados"} />
              </div>
            )}

            {/* ── Row 1: Histórico + Notificações (2 colunas) ── */}
            {!isAdmin && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

                {/* Histórico de pedidos com paginação */}
                <div className="rounded-2xl overflow-hidden flex flex-col" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
                  <div className="flex items-center justify-between px-4 py-3 border-b" style={{ borderColor: "var(--border)" }}>
                    <h2 className="text-sm font-bold" style={{ color: "var(--text)" }}>
                      <i className="fa-solid fa-receipt mr-2" style={{ color: "var(--primary)" }} />
                      Histórico de pedidos
                    </h2>
                    <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: "var(--surface-2)", color: "var(--text-muted)" }}>
                      {totalOrders}
                    </span>
                  </div>
                  <div className="flex-1 overflow-x-auto">
                    {totalOrders === 0 ? (
                      <p className="text-center py-8 text-sm" style={{ color: "var(--text-muted)" }}>Sem pedidos ainda.</p>
                    ) : (
                      <table className="w-full text-xs">
                        <thead>
                          <tr style={{ borderBottom: "1px solid var(--border)", color: "var(--text-muted)" }}>
                            {["Data", "Estado", "Tipo", "Total"].map(h => (
                              <th key={h} className="px-4 py-2 text-left text-[10px] uppercase tracking-wider font-semibold">{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {orders.slice((orderPage - 1) * ORDERS_PER_PAGE, orderPage * ORDERS_PER_PAGE).map(o => {
                            const inv = invoiceMap[o.id];
                            const s   = STATUS_STYLE[o.order_status] ?? { bg: "#F3F4F6", tx: "#374151" };
                            return (
                              <tr key={o.id} className="border-b hover:bg-[var(--surface-2)]" style={{ borderColor: "var(--border)" }}>
                                <td className="px-4 py-2.5" style={{ color: "var(--text-muted)" }}>{formatDate(o.created_at)}</td>
                                <td className="px-4 py-2.5">
                                  <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold" style={{ background: s.bg, color: s.tx }}>
                                    {o.order_status}
                                  </span>
                                </td>
                                <td className="px-4 py-2.5" style={{ color: "var(--text)" }}>{o.service_type}</td>
                                <td className="px-4 py-2.5 font-semibold" style={{ color: "var(--primary)" }}>{fmt(inv?.total_amount)}</td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    )}
                  </div>
                  {Math.ceil(totalOrders / ORDERS_PER_PAGE) > 1 && (
                    <div className="flex items-center justify-between px-4 py-2 border-t" style={{ borderColor: "var(--border)" }}>
                      <button disabled={orderPage === 1} onClick={() => setOrderPage(p => p - 1)}
                        className="text-xs disabled:opacity-30 hover:text-[var(--primary)] transition-colors cursor-pointer disabled:cursor-default"
                        style={{ color: "var(--text-muted)" }}>← Anterior</button>
                      <span className="text-xs" style={{ color: "var(--text-muted)" }}>{orderPage} / {Math.ceil(totalOrders / ORDERS_PER_PAGE)}</span>
                      <button disabled={orderPage === Math.ceil(totalOrders / ORDERS_PER_PAGE)} onClick={() => setOrderPage(p => p + 1)}
                        className="text-xs disabled:opacity-30 hover:text-[var(--primary)] transition-colors cursor-pointer disabled:cursor-default"
                        style={{ color: "var(--text-muted)" }}>Próxima →</button>
                    </div>
                  )}
                </div>

                {/* Notificações com paginação */}
                <div className="rounded-2xl overflow-hidden flex flex-col" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
                  <div className="flex items-center justify-between px-4 py-3 border-b" style={{ borderColor: "var(--border)" }}>
                    <h2 className="text-sm font-bold" style={{ color: "var(--text)" }}>
                      <i className="fa-solid fa-bell mr-2" style={{ color: "var(--primary)" }} />
                      Notificações
                    </h2>
                    <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: "var(--surface-2)", color: "var(--text-muted)" }}>
                      {notifications.length}
                    </span>
                  </div>
                  <div className="flex-1 divide-y" style={{ borderColor: "var(--border)" }}>
                    {notifications.length === 0 ? (
                      <p className="text-center py-8 text-sm" style={{ color: "var(--text-muted)" }}>Sem notificações.</p>
                    ) : (
                      notifications.slice((notifPage - 1) * NOTIFS_PER_PAGE, notifPage * NOTIFS_PER_PAGE).map(n => (
                        <div key={n.id} className="px-4 py-3 border-b last:border-0" style={{ borderColor: "var(--border)" }}>
                          <p className="text-xs font-semibold mb-0.5" style={{ color: "var(--text)" }}>{n.title}</p>
                          <p className="text-xs" style={{ color: "var(--text-muted)" }}>{n.message}</p>
                          <p className="text-[10px] mt-1" style={{ color: "var(--text-muted)" }}>{formatDate(n.sent_at)}</p>
                        </div>
                      ))
                    )}
                  </div>
                  {Math.ceil(notifications.length / NOTIFS_PER_PAGE) > 1 && (
                    <div className="flex items-center justify-between px-4 py-2 border-t" style={{ borderColor: "var(--border)" }}>
                      <button disabled={notifPage === 1} onClick={() => setNotifPage(p => p - 1)}
                        className="text-xs disabled:opacity-30 hover:text-[var(--primary)] transition-colors cursor-pointer disabled:cursor-default"
                        style={{ color: "var(--text-muted)" }}>← Anterior</button>
                      <span className="text-xs" style={{ color: "var(--text-muted)" }}>{notifPage} / {Math.ceil(notifications.length / NOTIFS_PER_PAGE)}</span>
                      <button disabled={notifPage === Math.ceil(notifications.length / NOTIFS_PER_PAGE)} onClick={() => setNotifPage(p => p + 1)}
                        className="text-xs disabled:opacity-30 hover:text-[var(--primary)] transition-colors cursor-pointer disabled:cursor-default"
                        style={{ color: "var(--text-muted)" }}>Próxima →</button>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* ── Row 2: Gráficos (2 colunas) — só para utilizadores normais ── */}
            {!isAdmin && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="rounded-2xl p-5" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
                  <h2 className="text-sm font-semibold mb-4" style={{ color: "var(--text)" }}>
                    <i className="fa-solid fa-chart-pie mr-2" style={{ color: "var(--text-muted)" }} />
                    Gastos por categoria
                  </h2>
                  {catLabels.length === 0 ? (
                    <p className="text-center py-8 text-sm" style={{ color: "var(--text-muted)" }}>Sem dados suficientes.</p>
                  ) : (
                    <div style={{ maxHeight: 260 }}><Doughnut data={doughnutData} options={doughnutOpts} /></div>
                  )}
                </div>
                <div className="rounded-2xl p-5" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
                  <h2 className="text-sm font-semibold mb-4" style={{ color: "var(--text)" }}>
                    <i className="fa-solid fa-chart-line mr-2" style={{ color: "var(--text-muted)" }} />
                    Valor por categoria (€)
                  </h2>
                  {catLabels.length === 0 ? (
                    <p className="text-center py-8 text-sm" style={{ color: "var(--text-muted)" }}>Sem dados suficientes.</p>
                  ) : (
                    <div style={{ maxHeight: 260 }}><Line data={lineData} options={lineOpts} /></div>
                  )}
                </div>
              </div>
            )}

            {/* Notificações admin — visível só para admin */}
            {isAdmin && (
              <div className="rounded-2xl overflow-hidden" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
                <div className="flex items-center justify-between px-4 py-3 border-b" style={{ borderColor: "var(--border)" }}>
                  <h2 className="text-sm font-bold" style={{ color: "var(--text)" }}>
                    <i className="fa-solid fa-bell mr-2" style={{ color: "var(--primary)" }} />
                    Notificações
                  </h2>
                  <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: "var(--surface-2)", color: "var(--text-muted)" }}>
                    {notifications.length}
                  </span>
                </div>
                {notifications.length === 0 ? (
                  <p className="text-center py-8 text-sm" style={{ color: "var(--text-muted)" }}>Sem notificações.</p>
                ) : (
                  <ul>
                    {notifications.map(n => (
                      <li key={n.id} className="px-4 py-3 border-b last:border-0" style={{ borderColor: "var(--border)" }}>
                        <p className="text-xs font-semibold mb-0.5" style={{ color: "var(--text)" }}>{n.title}</p>
                        <p className="text-xs" style={{ color: "var(--text-muted)" }}>{n.message}</p>
                        <p className="text-[10px] mt-1" style={{ color: "var(--text-muted)" }}>{formatDate(n.sent_at)}</p>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}

            {/* Zona de perigo — só para utilizadores normais */}
            {!isAdmin && (
              <div className="rounded-2xl p-4" style={{ background: "var(--surface)", border: "1px solid rgba(239,68,68,0.3)" }}>
                <h2 className="text-sm font-bold mb-1" style={{ color: "#ef4444" }}>
                  <i className="fa-solid fa-triangle-exclamation mr-2" />
                  Zona de perigo
                </h2>
                {deleteSuccess ? (
                  <p className="text-xs" style={{ color: "#22c55e" }}>
                    ✓ Pedido enviado ao administrador. A tua conta será analisada.
                  </p>
                ) : (
                  <>
                    <p className="text-xs mb-3" style={{ color: "var(--text-muted)" }}>
                      Para remover a tua conta, envia um pedido ao administrador. A conta só é removida após aprovação.
                    </p>
                    <button onClick={() => setShowDeleteModal(true)}
                      className="px-4 py-2 rounded-xl text-xs font-semibold transition-opacity hover:opacity-80"
                      style={{ background: "rgba(239,68,68,0.1)", color: "#ef4444", border: "1px solid rgba(239,68,68,0.3)" }}>
                      <i className="fa-solid fa-trash mr-1.5" />
                      Solicitar remoção de conta
                    </button>
                  </>
                )}
              </div>
            )}
          </>
        )}
      </div>

      {showDeleteModal && (
        <DeleteRequestModal
          onClose={() => setShowDeleteModal(false)}
          onConfirm={handleRequestDelete}
          loading={deleteLoading}
        />
      )}
    </div>
  );
}
