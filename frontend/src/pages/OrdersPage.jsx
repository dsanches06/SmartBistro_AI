import { useCallback, useEffect, useMemo, useState } from "react";
import { PageSection, Pagination, ListCard } from "@/components";
import { orderService, tableService, customerService, itemService, orderItemService } from "@/services";
import {
  formatTime,
  ORDER_PAGE_SIZE,
  ORDER_STATUS_META,
  ORDER_TABS,
  ORDER_TABLE_HEADERS,
  countOrdersByStatus,
  filterOrders,
  formatOrderValue,
  getOrderClientName,
  getOrderItemCount,
  getOrderTarget,
} from "@/utils";

/* ── NovoPedidoModal ── */
function NovoPedidoModal({ onClose, onCreated }) {
  const [loading,       setLoading]       = useState(true);
  const [tables,        setTables]        = useState([]);
  const [customers,     setCustomers]     = useState([]);
  const [menuItems,     setMenuItems]     = useState([]);
  const [form,          setForm]          = useState({ service_type: "Table", table_id: "", customer_id: "" });
  const [selectedItems, setSelectedItems] = useState([]);
  const [itemSearch,    setItemSearch]    = useState("");
  const [saving,        setSaving]        = useState(false);
  const [err,           setErr]           = useState("");

  useEffect(() => {
    Promise.all([
      tableService.getAll().catch(() => []),
      customerService.getAll().catch(() => []),
      itemService.getActive().catch(() => []),
    ]).then(([t, c, m]) => {
      setTables(Array.isArray(t) ? t : []);
      setCustomers(Array.isArray(c) ? c : []);
      setMenuItems(Array.isArray(m) ? m : []);
    }).finally(() => setLoading(false));
  }, []);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const addItem = (item) => {
    setSelectedItems(prev => {
      const ex = prev.find(i => i.item_id === item.id);
      if (ex) return prev.map(i => i.item_id === item.id ? { ...i, quantity: i.quantity + 1 } : i);
      return [...prev, { item_id: item.id, name: item.name, price: Number(item.price), quantity: 1 }];
    });
  };

  const updateQty = (item_id, qty) => {
    if (qty < 1) setSelectedItems(prev => prev.filter(i => i.item_id !== item_id));
    else setSelectedItems(prev => prev.map(i => i.item_id === item_id ? { ...i, quantity: qty } : i));
  };

  const filteredMenu = menuItems.filter(m => m.name.toLowerCase().includes(itemSearch.toLowerCase()));
  const totalItems   = selectedItems.reduce((s, i) => s + i.quantity, 0);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedItems.length) return setErr("Adicione pelo menos um item ao pedido.");
    setSaving(true); setErr("");
    try {
      const kitchen_sequence_json = selectedItems.flatMap(i => Array(i.quantity).fill(i.name));
      const orderData = {
        service_type: form.service_type,
        kitchen_sequence_json,
        order_status: "Pending",
        ...(form.table_id    ? { table_id:    parseInt(form.table_id)    } : {}),
        ...(form.customer_id ? { customer_id: parseInt(form.customer_id) } : {}),
      };
      const order = await orderService.create(orderData);
      await orderItemService.createBulk({
        order_id: order.id,
        items: selectedItems.map(i => ({ item_id: i.item_id, quantity: i.quantity })),
      });
      onCreated();
      onClose();
    } catch (e) {
      setErr("Erro ao criar pedido. Tente novamente.");
      console.error(e);
    } finally { setSaving(false); }
  };

  const inputStyle = { background: "var(--surface-2)", border: "1px solid var(--border)", color: "var(--text)" };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.5)" }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="rounded-[24px] p-6 w-full max-w-lg shadow-2xl flex flex-col max-h-[90vh]"
        style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-bold" style={{ color: "var(--text)" }}>Novo Pedido</h2>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-xl"
            style={{ background: "var(--surface-2)", color: "var(--text-muted)" }}>
            <i className="fa-solid fa-xmark text-sm" />
          </button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-10">
            <i className="fa-solid fa-spinner fa-spin text-xl" style={{ color: "var(--primary)" }} />
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col gap-4 overflow-y-auto flex-1 pr-1">

            {/* Tipo de serviço */}
            <div className="flex gap-2">
              {["Table", "Takeaway"].map(t => (
                <button key={t} type="button"
                  onClick={() => { set("service_type", t); if (t === "Takeaway") set("table_id", ""); }}
                  className="flex-1 py-2 rounded-xl text-sm font-semibold transition-all"
                  style={{
                    background: form.service_type === t ? "var(--primary)" : "var(--surface-2)",
                    color: form.service_type === t ? "#fff" : "var(--text-secondary)",
                  }}>
                  <i className={`fa-solid ${t === "Table" ? "fa-utensils" : "fa-bag-shopping"} mr-1.5 text-xs`} />
                  {t === "Table" ? "Mesa" : "Takeaway"}
                </button>
              ))}
            </div>

            {/* Mesa (só se Table) */}
            {form.service_type === "Table" && (
              <div>
                <label className="block text-xs font-semibold mb-1" style={{ color: "var(--text-secondary)" }}>Mesa</label>
                <select value={form.table_id} onChange={e => set("table_id", e.target.value)}
                  className="w-full rounded-xl px-3 py-2 text-sm outline-none" style={inputStyle}>
                  <option value="">Sem mesa específica</option>
                  {tables.filter(t => t.status === "Available").map(t => (
                    <option key={t.id} value={t.id}>Mesa {t.table_number} ({t.capacity} lugares)</option>
                  ))}
                </select>
              </div>
            )}

            {/* Cliente */}
            <div>
              <label className="block text-xs font-semibold mb-1" style={{ color: "var(--text-secondary)" }}>Cliente (opcional)</label>
              <select value={form.customer_id} onChange={e => set("customer_id", e.target.value)}
                className="w-full rounded-xl px-3 py-2 text-sm outline-none" style={inputStyle}>
                <option value="">Sem cliente</option>
                {customers.filter(c => c.active).map(c => (
                  <option key={c.id} value={c.id}>{c.name}{c.phone ? ` · ${c.phone}` : ""}</option>
                ))}
              </select>
            </div>

            {/* Itens do menu */}
            <div>
              <label className="block text-xs font-semibold mb-1" style={{ color: "var(--text-secondary)" }}>
                Itens do Menu {totalItems > 0 && <span style={{ color: "var(--primary)" }}>({totalItems} selecionados)</span>}
              </label>
              <input type="text" value={itemSearch} onChange={e => setItemSearch(e.target.value)}
                placeholder="Pesquisar item…"
                className="w-full rounded-xl px-3 py-2 text-sm outline-none mb-2"
                style={inputStyle} />
              <div className="rounded-xl overflow-hidden" style={{ border: "1px solid var(--border)", maxHeight: 220, overflowY: "auto" }}>
                {filteredMenu.length === 0 ? (
                  <p className="text-xs text-center py-4" style={{ color: "var(--text-muted)" }}>Nenhum item encontrado.</p>
                ) : filteredMenu.map(item => {
                  const sel = selectedItems.find(s => s.item_id === item.id);
                  return (
                    <div key={item.id} className="flex items-center justify-between px-3 py-2"
                      style={{ borderBottom: "1px solid var(--border)" }}>
                      <div>
                        <p className="text-sm font-medium" style={{ color: "var(--text)" }}>{item.name}</p>
                        <p className="text-xs" style={{ color: "var(--text-muted)" }}>{Number(item.price).toFixed(2)} €</p>
                      </div>
                      {sel ? (
                        <div className="flex items-center gap-2">
                          <button type="button" onClick={() => updateQty(item.id, sel.quantity - 1)}
                            className="w-6 h-6 rounded-lg flex items-center justify-center text-xs font-bold"
                            style={{ background: "var(--surface-2)", color: "var(--text)" }}>−</button>
                          <span className="text-sm font-semibold w-4 text-center" style={{ color: "var(--text)" }}>{sel.quantity}</span>
                          <button type="button" onClick={() => updateQty(item.id, sel.quantity + 1)}
                            className="w-6 h-6 rounded-lg flex items-center justify-center text-xs font-bold"
                            style={{ background: "var(--primary)", color: "#fff" }}>+</button>
                        </div>
                      ) : (
                        <button type="button" onClick={() => addItem(item)}
                          className="w-7 h-7 rounded-lg flex items-center justify-center text-xs"
                          style={{ background: "var(--primary)", color: "#fff" }}>
                          <i className="fa-solid fa-plus" />
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
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
                {saving ? <i className="fa-solid fa-spinner fa-spin" /> : "Criar Pedido"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

/* ── StatusBadge ── */
function StatusBadge({ status }) {
  const m = ORDER_STATUS_META[status] ?? { label: status, bg: "#f3f4f6", color: "#9ca3af", text: "#4b5563" };
  return (
    <span
      style={{
        display: "inline-block",
        backgroundColor: m.bg,
        color: m.text,
        border: `1px solid ${m.color}40`,
        borderRadius: 999,
        padding: "2px 10px",
        fontSize: 12,
        fontWeight: 600,
        whiteSpace: "nowrap",
      }}
    >
      {m.label}
    </span>
  );
}

/* ── Desktop table row ── */
function OrderRow({ order, onDelete }) {
  const isDone = order.order_status === "Ready";

  return (
    <tr
      className="border-b border-[var(--border)] transition-colors"
      onMouseEnter={e => { e.currentTarget.style.background = "var(--surface-2)"; }}
      onMouseLeave={e => { e.currentTarget.style.background = ""; }}
    >
      <td className="py-3 px-4 text-sm font-semibold" style={{ color: "var(--primary)" }}>
        #{order.id}
      </td>
      <td className="py-3 px-4 text-sm">{getOrderTarget(order)}</td>
      <td className="py-3 px-4 text-sm">{getOrderClientName(order)}</td>
      <td className="py-3 px-4"><StatusBadge status={order.order_status} /></td>
      <td className="py-3 px-4 text-sm text-center">{getOrderItemCount(order)}</td>
      <td className="py-3 px-4 text-sm font-semibold">{formatOrderValue(order.total_amount)}</td>
      <td className="py-3 px-4 text-sm" style={{ color: "var(--text-secondary)" }}>
        {formatTime(order.created_at)}
      </td>
      <td className="py-3 px-4">
        {isDone ? (
          <button
            onClick={() => onDelete(order.id)}
            title="Remover pedido"
            className="inline-flex items-center justify-center w-8 h-8 rounded-lg transition-colors"
            style={{ color: "#ef4444" }}
            onMouseEnter={e => { e.currentTarget.style.background = "#fef2f2"; }}
            onMouseLeave={e => { e.currentTarget.style.background = ""; }}
          >
            <i className="fa-solid fa-trash text-xs" />
          </button>
        ) : null}
      </td>
    </tr>
  );
}

/* ── Mobile order card ── */
function OrderCard({ order }) {
  return (
    <ListCard>
      <div className="flex items-baseline justify-between">
        <span className="text-sm font-bold" style={{ color: "var(--primary)" }}>
          #{order.id} · {getOrderTarget(order)}
        </span>
        <span className="text-sm font-bold tabular-nums" style={{ color: "var(--text)" }}>
          {formatOrderValue(order.total_amount)}
        </span>
      </div>
      <div className="flex items-center justify-between">
        <span className="text-xs" style={{ color: "var(--text-secondary)" }}>
          {getOrderClientName(order)}
        </span>
        <span className="text-xs tabular-nums" style={{ color: "var(--text-muted)" }}>
          {formatTime(order.created_at)}
        </span>
      </div>
      <div className="pt-0.5">
        <StatusBadge status={order.order_status} />
      </div>
    </ListCard>
  );
}

/* ── OrdersPage ── */
export default function OrdersPage() {
  const [orders,      setOrders]      = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [error,       setError]       = useState(null);
  const [tab,         setTab]         = useState("all");
  const [search,      setSearch]      = useState("");
  const [page,        setPage]        = useState(1);
  const [showCreate,  setShowCreate]  = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await orderService.getAll();
      setOrders(Array.isArray(res) ? res : []);
    } catch (err) {
      console.error(err);
      setError("Não foi possível carregar os pedidos. Tente novamente.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { setPage(1); }, [tab, search]);

  const handleDelete = useCallback(async (id) => {
    try {
      await orderService.remove(id);
      setOrders(prev => prev.filter(o => o.id !== id));
    } catch (err) {
      console.error(err);
    }
  }, []);

  const counts   = useMemo(() => countOrdersByStatus(orders), [orders]);
  const filtered = useMemo(() => filterOrders(orders, { tab, search }), [orders, tab, search]);
  const pageData = filtered.slice((page - 1) * ORDER_PAGE_SIZE, page * ORDER_PAGE_SIZE);

  return (
    <PageSection>
      <div className="rounded-[32px] bg-surface p-6 shadow-sm">

        {showCreate && (
          <NovoPedidoModal
            onClose={() => setShowCreate(false)}
            onCreated={load}
          />
        )}

        {/* ── Header ── */}
        <div className="flex items-center justify-between gap-2 mb-5">
          <h1 className="text-xl sm:text-2xl font-bold" style={{ color: "var(--text)" }}>Pedidos</h1>
          <div className="flex gap-2 flex-shrink-0">
            <button
              onClick={() => setShowCreate(true)}
              className="flex items-center gap-1.5 px-3 sm:px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold text-white whitespace-nowrap"
              style={{ background: "var(--primary)" }}
            >
              <i className="fa-solid fa-plus text-[10px] sm:text-xs" />
              Novo Pedido
            </button>
            <button
              onClick={load}
              title="Atualizar"
              className="w-8 h-8 sm:w-9 sm:h-9 inline-flex items-center justify-center rounded-xl border border-[var(--border)] transition-colors flex-shrink-0"
              style={{ color: "var(--text-secondary)", background: "var(--surface-2)" }}
            >
              <i className={`fa-solid fa-rotate-right text-xs sm:text-sm${loading ? " fa-spin" : ""}`} />
            </button>
          </div>
        </div>

        {/* ── Status Tabs ── */}
        <div className="flex items-center justify-between sm:justify-start gap-2 sm:gap-1.5 mb-4 pt-2">
          {ORDER_TABS.map(({ key, label, icon }) => {
            const active = tab === key;
            const count  = counts[key] ?? 0;
            return (
              <button
                key={key}
                onClick={() => setTab(key)}
                title={label}
                className="relative flex-1 sm:flex-shrink-0 sm:flex-initial flex items-center justify-center gap-1 sm:gap-1.5 rounded-full px-2 sm:px-3 py-2 sm:py-1.5 text-xs sm:text-sm font-semibold transition-all"
                style={{
                  background: active ? "var(--primary)" : "var(--surface-2)",
                  color: active ? "#fff" : "var(--text-secondary)",
                }}
              >
                <i className={`${icon} text-xs`} />
                <span className="hidden sm:inline whitespace-nowrap">{label}</span>
                {key !== "all" && count > 0 && (
                  <>
                    {/* Mobile: badge absoluto */}
                    <span className="sm:hidden absolute -top-1.5 -right-1 w-4 h-4 flex items-center justify-center rounded-full text-[9px] font-bold"
                      style={{ background: active ? "rgba(255,255,255,0.9)" : "var(--primary)", color: active ? "var(--primary)" : "#fff" }}>
                      {count}
                    </span>
                    {/* Desktop: badge inline */}
                    <span className="hidden sm:inline rounded-full px-1.5 py-0.5 text-[10px] font-bold"
                      style={{ background: active ? "rgba(255,255,255,0.3)" : "var(--primary)", color: "#fff" }}>
                      {count}
                    </span>
                  </>
                )}
              </button>
            );
          })}
        </div>

        {/* ── Search + Filter ── */}
        <div className="flex items-center gap-2 mb-5">
          <div
            className="flex flex-1 items-center gap-2 rounded-xl px-3 py-2.5"
            style={{ background: "var(--surface-2)", border: "1px solid var(--border)" }}
          >
            <i className="fa-solid fa-magnifying-glass text-sm" style={{ color: "var(--text-muted)" }} />
            <input
              type="text"
              placeholder="Pesquisar..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="flex-1 bg-transparent text-sm outline-none"
              style={{ color: "var(--text)" }}
            />
            {search && (
              <button onClick={() => setSearch("")} style={{ color: "var(--text-muted)" }}>
                <i className="fa-solid fa-xmark text-xs" />
              </button>
            )}
          </div>
          <button
            className="flex items-center gap-2 rounded-xl px-3 py-2.5 text-sm font-semibold"
            style={{ background: "var(--surface-2)", border: "1px solid var(--border)", color: "var(--text-secondary)" }}
          >
            <i className="fa-solid fa-sliders text-xs" />
            <span className="hidden sm:inline">Filtros</span>
          </button>
        </div>

        {/* ── Content ── */}
        {loading ? (
          <div
            className="rounded-2xl p-12 text-center text-sm"
            style={{ background: "var(--surface-2)", color: "var(--text-secondary)" }}
          >
            <i className="fa-solid fa-spinner fa-spin mr-2" />
            A carregar pedidos…
          </div>
        ) : error ? (
          <div className="rounded-2xl p-10 text-center text-sm" style={{ background: "#fef2f2", color: "#991b1b" }}>
            <i className="fa-solid fa-circle-exclamation mr-2" />
            {error}
            <button onClick={load} className="ml-3 underline font-semibold">Tentar novamente</button>
          </div>
        ) : (
          <>
            {/* Desktop table */}
            <div className="hidden md:block overflow-x-auto rounded-2xl" style={{ border: "1px solid var(--border)" }}>
              <table className="w-full text-left">
                <thead>
                  <tr style={{ borderBottom: "1px solid var(--border)", background: "var(--surface-2)" }}>
                    {ORDER_TABLE_HEADERS.map(h => (
                      <th key={h} className="py-3 px-4 text-xs font-semibold uppercase tracking-wider"
                        style={{ color: "var(--text-secondary)" }}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {pageData.length === 0 ? (
                    <tr>
                      <td colSpan={ORDER_TABLE_HEADERS.length} className="py-12 text-center text-sm"
                        style={{ color: "var(--text-muted)" }}>
                        Nenhum pedido encontrado.
                      </td>
                    </tr>
                  ) : (
                    pageData.map(o => <OrderRow key={o.id} order={o} onDelete={handleDelete} />)
                  )}
                </tbody>
              </table>
            </div>

            {/* Mobile cards */}
            <div className="md:hidden flex flex-col gap-2.5">
              {pageData.length === 0 ? (
                <p className="py-10 text-center text-sm" style={{ color: "var(--text-muted)" }}>
                  Nenhum pedido encontrado.
                </p>
              ) : (
                pageData.map(o => <OrderCard key={o.id} order={o} />)
              )}
            </div>

            {/* Footer */}
            <div className="flex flex-wrap items-center justify-between gap-3 mt-4">
              <span className="text-sm" style={{ color: "var(--text-secondary)" }}>
                Total pedidos: <strong>{filtered.length}</strong>
              </span>
              <Pagination page={page} total={filtered.length} pageSize={ORDER_PAGE_SIZE} onChange={setPage} />
            </div>
          </>
        )}
      </div>
    </PageSection>
  );
}
