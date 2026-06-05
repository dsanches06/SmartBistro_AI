import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router";
import { Chart as ChartJS, ArcElement, CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Legend, Filler } from "chart.js";
import { Doughnut, Line } from "react-chartjs-2";
import { useAuth } from "@/context/AuthContext";
import { authService } from "@/services/authService";
import { customerService } from "@/services/customerService";
import { orderService }    from "@/services/orderService";
import { invoiceService }  from "@/services/invoiceService";
import { paymentService }  from "@/services/paymentService";
import { orderItemService } from "@/services/orderItemService";
import { itemService }     from "@/services/itemService";
import { getPalette, getInitials, formatDate } from "@/components/customers/CustomerCard";
import TrophySpin from "@/components/ui/TrophySpin";
import { CAT_COLORS, CAT_FALLBACK } from "@/utils/menuUtils";
import { ORDER_STATUS_STYLE as STATUS_STYLE, ORDERS_PER_PAGE } from "@/utils/orderUtils";
import { fmtEur } from "@/utils/dashboardUtils";

ChartJS.register(ArcElement, CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Legend, Filler);

const fmt = (v) => v == null ? '—' : fmtEur(v);

function StatBox({ label, value, sub, color }) {
  return (
    <div className="rounded-2xl p-4 flex flex-col gap-1" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
      <p className="text-[10px] uppercase tracking-widest font-semibold" style={{ color: "var(--text-muted)" }}>{label}</p>
      <p className="text-xl font-bold" style={{ color: color ?? "var(--text)" }}>{value}</p>
      {sub && <p className="text-xs" style={{ color: "var(--text-muted)" }}>{sub}</p>}
    </div>
  );
}

const PAYMENT_METHODS = [
  { value: "MB Way",       label: "MB Way" },
  { value: "Multibanco",   label: "Multibanco" },
  { value: "Credit Card",  label: "Cartão de Crédito" },
  { value: "Cash",         label: "Numerário" },
];
const PAYMENT_KEYWORDS = /pagamento|pagar|fatura|faturação|invoice|payment|valor/i;

function PaymentModal({ onClose, unpaidInvoices, onPaid, customerId }) {
  const [method, setMethod]   = useState(PAYMENT_METHODS[0].value);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError]     = useState("");

  const grandTotal = unpaidInvoices.reduce((s, { inv }) => s + Number(inv?.total_amount ?? 0), 0);

  const handlePay = async () => {
    if (!unpaidInvoices.length) return;
    setError("");
    setLoading(true);
    try {
      const now = new Date().toISOString();
      // Cria um pagamento por fatura + marca cada pedido como Entregue
      await Promise.all(
        unpaidInvoices.map(({ inv, orderId }) =>
          paymentService.create({
            invoice_id:     inv.id,
            customer_id:    customerId ?? null,
            amount:         Number(inv.total_amount),
            payment_method: method,
            payment_status: "Completed",
          })
          .catch(err => {
            // 409 = já existe pagamento para esta fatura — ignora e avança pedido
            if (!err?.message?.includes('409')) throw err;
          })
          .then(() =>
            orderId
              ? orderService.updateStatus(orderId, "Delivered").catch(() => {})
              : Promise.resolve()
          )
        )
      );
      setSuccess(true);
      setTimeout(() => { onPaid(); onClose(); }, 1500);
    } catch (e) {
      setError(e?.message || "Erro ao processar pagamento.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)" }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="w-full max-w-sm rounded-2xl p-6 shadow-2xl"
        style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-base font-bold" style={{ color: "var(--text)" }}>
            <i className="fa-solid fa-credit-card mr-2" style={{ color: "var(--primary)" }} />
            Efectuar pagamento
          </h3>
          <button onClick={onClose} className="p-1.5 rounded-lg" style={{ color: "var(--text-muted)" }}>
            <i className="fa-solid fa-xmark" />
          </button>
        </div>

        {success ? (
          <div className="text-center py-6">
            <i className="fa-solid fa-circle-check text-4xl mb-3" style={{ color: "#22c55e" }} />
            <p className="font-semibold text-sm" style={{ color: "var(--text)" }}>Pagamento registado!</p>
            <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>Os teus pedidos foram marcados como entregues.</p>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {/* Resumo das faturas */}
            <div className="rounded-xl overflow-hidden" style={{ border: "1px solid var(--border)" }}>
              {unpaidInvoices.map(({ inv }, i) => (
                <div key={inv.id} className="flex items-center justify-between px-4 py-2.5"
                  style={{ borderBottom: i < unpaidInvoices.length - 1 ? "1px solid var(--border)" : "none", background: "var(--surface-2)" }}>
                  <span className="text-xs" style={{ color: "var(--text-muted)" }}>
                    Pedido #{String(inv.id).slice(0, 8)}
                  </span>
                  <span className="text-xs font-semibold" style={{ color: "var(--text)" }}>
                    {Number(inv.total_amount).toFixed(2)} €
                  </span>
                </div>
              ))}
            </div>

            {/* Total consolidado */}
            <div className="flex items-center justify-between px-4 py-3 rounded-xl"
              style={{ background: "var(--surface-2)", border: "1px solid var(--border)" }}>
              <span className="text-sm font-semibold" style={{ color: "var(--text-muted)" }}>
                Total {unpaidInvoices.length > 1 ? `(${unpaidInvoices.length} pedidos)` : ""}
              </span>
              <span className="text-xl font-bold" style={{ color: "var(--primary)" }}>
                {grandTotal.toFixed(2)} €
              </span>
            </div>

            {/* Método de pagamento */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>
                Método de pagamento
              </label>
              <div className="grid grid-cols-2 gap-2">
                {PAYMENT_METHODS.map(({ value, label }) => (
                  <button
                    key={value}
                    onClick={() => setMethod(value)}
                    className="py-2 px-3 rounded-xl text-xs font-semibold transition-all text-left"
                    style={{
                      background: method === value ? "var(--primary)" : "var(--surface-2)",
                      color: method === value ? "#fff" : "var(--text-secondary)",
                      border: method === value ? "1.5px solid var(--primary)" : "1.5px solid var(--border)",
                    }}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {error && (
              <p className="text-xs px-3 py-2 rounded-lg" style={{ background: "rgba(239,68,68,0.1)", color: "#ef4444" }}>
                {error}
              </p>
            )}

            <button
              onClick={handlePay}
              disabled={loading || !unpaidInvoices.length}
              className="w-full py-3 rounded-2xl text-sm font-bold text-white disabled:opacity-60"
              style={{ background: "var(--primary)" }}
            >
              {loading ? "A processar..." : `Pagar ${grandTotal.toFixed(2)} €`}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function EditProfileModal({ onClose, user, onSaved }) {
  const [name,     setName]     = useState(user.name     ?? "");
  const [username, setUsername] = useState(user.username ?? "");
  const [email,    setEmail]    = useState(user.email    ?? "");
  const [phone,    setPhone]    = useState(user.phone    ?? "");
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState("");

  const handleSave = async (e) => {
    e.preventDefault();
    if (!name.trim()) { setError("O nome é obrigatório."); return; }
    setError("");
    setLoading(true);
    try {
      await customerService.update(user.id, { name: name.trim(), username: username.trim() || undefined, email: email.trim() || undefined, phone: phone.trim() || undefined });
      onSaved({ ...user, name: name.trim(), username: username.trim(), email: email.trim(), phone: phone.trim() });
      onClose();
    } catch (e) {
      setError(e?.message || "Erro ao guardar.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)" }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="w-full max-w-sm rounded-2xl p-6 shadow-2xl"
        style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-base font-bold" style={{ color: "var(--text)" }}>
            <i className="fa-solid fa-pen-to-square mr-2" style={{ color: "var(--primary)" }} />
            Editar dados
          </h3>
          <button onClick={onClose} className="p-1.5 rounded-lg" style={{ color: "var(--text-muted)" }}>
            <i className="fa-solid fa-xmark" />
          </button>
        </div>
        <form className="flex flex-col gap-3" onSubmit={handleSave}>
          {[
            { label: "Nome completo *", value: name,     set: setName,     type: "text",  placeholder: "O teu nome" },
            { label: "Username",        value: username, set: setUsername, type: "text",  placeholder: "username" },
            { label: "E-mail",          value: email,    set: setEmail,    type: "email", placeholder: "email" },
            { label: "Telefone",        value: phone,    set: setPhone,    type: "tel",   placeholder: "telefone" },
          ].map(({ label, value, set, type, placeholder }) => (
            <div key={label} className="flex flex-col gap-1">
              <label className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>{label}</label>
              <input
                type={type}
                value={value}
                onChange={e => set(e.target.value)}
                placeholder={placeholder}
                className="w-full h-9 rounded-lg px-3 text-sm outline-none"
                style={{ background: "var(--surface-2)", border: "1.5px solid var(--border)", color: "var(--text)" }}
                onFocus={e => e.target.style.borderColor = "var(--primary)"}
                onBlur={e => e.target.style.borderColor = "var(--border)"}
              />
            </div>
          ))}
          {error && (
            <p className="text-xs px-3 py-2 rounded-lg" style={{ background: "rgba(239,68,68,0.1)", color: "#ef4444" }}>{error}</p>
          )}
          <div className="flex gap-2 pt-1">
            <button type="button" onClick={onClose} disabled={loading}
              className="flex-1 py-2 rounded-xl text-sm font-semibold"
              style={{ background: "var(--surface-2)", color: "var(--text-secondary)" }}>
              Cancelar
            </button>
            <button type="submit" disabled={loading}
              className="flex-1 py-2 rounded-xl text-sm font-bold text-white disabled:opacity-60"
              style={{ background: "var(--primary)" }}>
              {loading ? "A guardar..." : "Guardar"}
            </button>
          </div>
        </form>
      </div>
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
  const { user, token, logout, updateUser } = useAuth();
  const navigate  = useNavigate();
  const palette   = getPalette(user?.id);

  const [orders,          setOrders]         = useState([]);
  const [invoiceMap,      setInvoiceMap]     = useState({});
  const [paidInvIds,      setPaidInvIds]     = useState(new Set());
  const [categoryTotals,  setCategoryTotals] = useState({});
  const [orderPage,       setOrderPage]      = useState(1);
  const [loading,         setLoading]        = useState(true);
  const [showPayModal,    setShowPayModal]   = useState(false);
  const [showEditModal,   setShowEditModal]  = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteLoading,   setDeleteLoading]   = useState(false);
  const [deleteSuccess,   setDeleteSuccess]   = useState(false);

  useEffect(() => {
    if (!user?.id) return;
    Promise.all([
      orderService.getByCustomer(user.id).catch(() => []),
      itemService.getAll().catch(() => []),
      paymentService.getByCustomer(user.id).catch(() => []),
    ]).then(async ([orderList, allItems, paymentList]) => {
      const rows    = Array.isArray(orderList) ? orderList : [];
      const itemMap = Object.fromEntries((Array.isArray(allItems) ? allItems : []).map(i => [i.id, i]));
      setOrders(rows);
      setPaidInvIds(new Set((Array.isArray(paymentList) ? paymentList : []).map(p => p.invoice_id)));

      // Só busca fatura para pedidos que já saíram de Pending (Pending nunca tem fatura)
      const billableOrders = rows.filter(o => o.order_status !== 'Pending');
      const pendingPairs   = rows.filter(o => o.order_status === 'Pending').map(o => [o.id, null]);

      const [invPairs, oiPairs] = await Promise.all([
        Promise.all(billableOrders.map(o => invoiceService.getByOrder(o.id).then(inv => [o.id, inv]).catch(() => [o.id, null]))),
        Promise.all(rows.map(o => orderItemService.getByOrder(o.id).then(items => [o.id, items]).catch(() => [o.id, []]))),
      ]);

      const allInvPairs = [...invPairs, ...pendingPairs];

      setInvoiceMap(Object.fromEntries(allInvPairs));

      // Calcular gastos por categoria
      // Fallback: se sem order_items, usa kitchen_sequence_json (pedidos do carrinho)
      const itemByName = Object.fromEntries(
        Object.values(itemMap).map(i => [i.name?.toLowerCase(), i])
      );
      const catTotals = {};
      for (const [orderId, items] of oiPairs) {
        if (Array.isArray(items) && items.length > 0) {
          for (const oi of items) {
            const item = itemMap[oi.item_id];
            if (!item) continue;
            catTotals[item.category] = (catTotals[item.category] || 0) + Number(item.price) * Number(oi.quantity);
          }
        } else {
          // Fallback: parse kitchen_sequence_json
          const order = rows.find(o => String(o.id) === String(orderId));
          let kItems = [];
          try {
            const raw = typeof order?.kitchen_sequence_json === 'string'
              ? JSON.parse(order.kitchen_sequence_json)
              : order?.kitchen_sequence_json;
            kItems = Array.isArray(raw) ? raw : [];
          } catch { kItems = []; }
          for (const ki of kItems) {
            if (typeof ki !== 'object' || !ki.name) continue;
            const found = itemByName[ki.name?.toLowerCase()];
            if (!found) continue;
            catTotals[found.category] = (catTotals[found.category] || 0) + Number(ki.price || found.price) * Number(ki.quantity || 1);
          }
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
  if (user.role_id === 1) { navigate("/dashboard", { replace: true }); return null; }

  const isAdmin     = user.role_id === 1;
  const totalGasto = useMemo(
    () => Object.values(invoiceMap).filter(Boolean).reduce((s, inv) => s + Number(inv.total_amount ?? 0), 0),
    [invoiceMap]
  );

  const unpaidInvoices = useMemo(
    () => Object.entries(invoiceMap)
      .filter(([, inv]) => inv && !paidInvIds.has(inv.id))
      .map(([orderId, inv]) => ({ orderId, inv })),
    [invoiceMap, paidInvIds]
  );

  const totalOrders = orders.length;
  const avgOrder    = useMemo(() => totalOrders > 0 ? totalGasto / totalOrders : 0, [totalOrders, totalGasto]);
  const catEntries  = useMemo(() => Object.entries(categoryTotals).sort((a, b) => b[1] - a[1]), [categoryTotals]);

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
            <button
              onClick={() => setShowEditModal(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all"
              style={{ background: "var(--surface-2)", color: "var(--text-secondary)", border: "1px solid var(--border)" }}>
              <i className="fa-solid fa-pen-to-square" />
              <span className="hidden sm:inline">Editar</span>
            </button>
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

            {/* ── Faturas pendentes — aparece se houver faturas por pagar ── */}
            {!isAdmin && unpaidInvoices.length > 0 && (
              <div
                className="flex items-center justify-between gap-4 px-4 py-3 rounded-2xl"
                style={{ background: "rgba(34,197,94,0.08)", border: "1px solid rgba(34,197,94,0.25)" }}
              >
                <div className="flex items-center gap-3">
                  <i className="fa-solid fa-file-invoice-dollar text-lg" style={{ color: "#22c55e" }} />
                  <div>
                    <p className="text-sm font-bold" style={{ color: "var(--text)" }}>
                      {unpaidInvoices.length === 1 ? "1 fatura pendente" : `${unpaidInvoices.length} faturas pendentes`}
                    </p>
                    <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                      Total: {unpaidInvoices.reduce((s, u) => s + Number(u.inv.total_amount ?? 0), 0).toFixed(2)} €
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setShowPayModal(true)}
                  className="flex-shrink-0 flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-white transition-opacity hover:opacity-85"
                  style={{ background: "#22c55e" }}
                >
                  <i className="fa-solid fa-credit-card" />
                  Pagar
                </button>
              </div>
            )}

            {/* ── Histórico de pedidos (full-width) ── */}
            {!isAdmin && (
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
                <div className="overflow-x-auto">
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
                              <td className="px-4 py-2.5 whitespace-nowrap" style={{ color: "var(--text-muted)" }}>{formatDate(o.created_at)}</td>
                              <td className="px-4 py-2.5">
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold whitespace-nowrap" style={{ background: s.bg, color: s.tx }}>
                                  {o.order_status}
                                </span>
                              </td>
                              <td className="px-4 py-2.5 whitespace-nowrap" style={{ color: "var(--text)" }}>{o.service_type}</td>
                              <td className="px-4 py-2.5 font-semibold whitespace-nowrap" style={{ color: "var(--primary)" }}>{fmt(inv?.total_amount)}</td>
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

      {showEditModal && (
        <EditProfileModal
          onClose={() => setShowEditModal(false)}
          user={user}
          onSaved={(updated) => { updateUser(updated); }}
        />
      )}

      {showDeleteModal && (
        <DeleteRequestModal
          onClose={() => setShowDeleteModal(false)}
          onConfirm={handleRequestDelete}
          loading={deleteLoading}
        />
      )}

      {showPayModal && (
        <PaymentModal
          onClose={() => setShowPayModal(false)}
          unpaidInvoices={unpaidInvoices}
          customerId={user.id}
          onPaid={() => {
            setShowPayModal(false);
            // Recarrega payments para actualizar estado
            paymentService.getByCustomer(user.id).then(list => {
              setPaidInvIds(new Set((Array.isArray(list) ? list : []).map(p => p.invoice_id)));
            }).catch(() => {});
          }}
        />
      )}
    </div>
  );
}
