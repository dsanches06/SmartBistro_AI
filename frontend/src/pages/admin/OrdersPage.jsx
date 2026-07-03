import { useCallback, useEffect, useMemo, useState } from "react";
import { PageSection, Pagination, ListCard, PaymentModal } from "@/components";
import { SortTh } from "@/components/ui/shared/SortTh.jsx";
import { orderService, tableService, userService, itemService, orderItemService, invoiceService, stockService, recipeItemService } from "@/services";
import {
  formatTime,
  getItemEmoji,
  ORDER_PAGE_SIZE,
  ORDER_STATUS_META,
  ORDER_TABS,
  ORDER_TABLE_HEADERS,
  countOrdersByStatus,
  filterOrders,
  fmtEur,
  getOrderClientName,
  getOrderItemCount,
  getOrderTarget,
} from "@/utils";
import { MENU_CATEGORY_META, getMaxAvailableQty } from "@/utils/menuUtils";

/* ── NovoPedidoModal ── */
function NovoPedidoModal({ onClose, onCreated }) {
  const [loading,       setLoading]       = useState(true);
  const [tables,        setTables]        = useState([]);
  const [customers,     setCustomers]     = useState([]);
  const [menuItems,     setMenuItems]     = useState([]);
  const [form,          setForm]          = useState({ service_type: "Table", table_id: "", user_id: "" });
  const [selectedItems, setSelectedItems] = useState([]);
  const [itemSearch,    setItemSearch]    = useState("");
  const [saving,        setSaving]        = useState(false);
  const [err,           setErr]           = useState("");
  const [pendingPayment, setPendingPayment] = useState(null); // { invoice, orderId } — takeaway aguarda pagamento
  const [stockByIngredient, setStockByIngredient] = useState(new Map());
  const [recipeItems, setRecipeItems] = useState([]);

  useEffect(() => {
    Promise.all([
      tableService.getAll().catch(() => []),
      userService.getAll().catch(() => []),
      itemService.getActive().catch(() => []),
      stockService.getAll().catch(() => []),
      recipeItemService.getAll().catch(() => []),
    ]).then(([t, c, m, stock, recipes]) => {
      setTables(Array.isArray(t) ? t : []);
      setCustomers(Array.isArray(c) ? c : []);
      setMenuItems(Array.isArray(m) ? m : []);
      setStockByIngredient(new Map((Array.isArray(stock) ? stock : []).map(s => [s.ingredient_id, s.available_quantity])));
      setRecipeItems(Array.isArray(recipes) ? recipes : []);
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
      const kitchen_sequence_json = selectedItems.map(i => ({ name: i.name, quantity: i.quantity, price: i.price }));
      const orderData = {
        service_type: form.service_type,
        kitchen_sequence_json,
        order_status: "Pending",
        ...(form.table_id    ? { table_id:    parseInt(form.table_id)    } : {}),
        ...(form.user_id ? { user_id: parseInt(form.user_id) } : {}),
      };
      const order = await orderService.create(orderData);
      await orderItemService.createBulk({
        order_id: order.id,
        items: selectedItems.map(i => ({ item_id: i.item_id, quantity: i.quantity })),
      });

      // Takeaway com cliente associado — o backend já criou a fatura; pede o pagamento
      // antes de o pedido seguir para a cozinha (mesmo fluxo do cardápio do cliente).
      if (form.service_type === "Takeaway" && form.user_id) {
        const invoice = await invoiceService.getByOrder(order.id).catch(() => null);
        if (!invoice?.id) {
          setErr("Stock insuficiente para preparar o pedido — foi cancelado.");
          onCreated();
          return;
        }
        setPendingPayment({ invoice, orderId: order.id });
        return;
      }

      onCreated();
      onClose();
    } catch (e) {
      setErr("Erro ao criar pedido. Tente novamente.");
      console.error(e);
    } finally { setSaving(false); }
  };

  const handlePaymentDone = () => {
    if (pendingPayment) orderService.chefStart(pendingPayment.orderId).catch(() => {});
    setPendingPayment(null);
    onCreated();
    onClose();
  };

  // Pedido e fatura já foram criados — fechar sem pagar só dispensa o modal,
  // o pedido fica "Pending" a aguardar pagamento (tal como no cardápio do cliente).
  const handlePaymentSkip = () => {
    setPendingPayment(null);
    onCreated();
    onClose();
  };

  const inputStyle = { background: "var(--surface-2)", border: "1px solid var(--border)", color: "var(--text)" };

  if (pendingPayment) {
    return (
      <PaymentModal
        unpaidInvoices={[{ inv: pendingPayment.invoice, orderId: pendingPayment.orderId }]}
        userId={form.user_id ? parseInt(form.user_id) : null}
        onPaid={handlePaymentDone}
        onClose={handlePaymentSkip}
      />
    );
  }

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

            {/* Tipo de serviço — abas */}
            <div className="flex gap-4" style={{ borderBottom: "1px solid var(--border)" }} role="tablist">
              {["Table", "Takeaway"].map(t => {
                const active = form.service_type === t;
                return (
                  <button key={t} type="button" role="tab" aria-selected={active}
                    onClick={() => { set("service_type", t); if (t === "Takeaway") set("table_id", ""); }}
                    className="flex items-center gap-1.5 pb-2.5 text-sm font-semibold transition-colors"
                    style={{
                      color: active ? "var(--primary)" : "var(--text-muted)",
                      borderBottom: active ? "2px solid var(--primary)" : "2px solid transparent",
                      marginBottom: -1,
                    }}>
                    <i className={`fa-solid ${t === "Table" ? "fa-utensils" : "fa-bag-shopping"} text-xs`} />
                    {t === "Table" ? "Mesa" : "Takeaway"}
                  </button>
                );
              })}
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
              <select value={form.user_id} onChange={e => set("user_id", e.target.value)}
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
              <div className="rounded-xl px-3 py-2" style={{ border: "1px solid var(--border)", maxHeight: 280, overflowY: "auto" }}>
                {filteredMenu.length === 0 ? (
                  <p className="text-xs text-center py-4" style={{ color: "var(--text-muted)" }}>Nenhum item encontrado.</p>
                ) : (
                  <div className="flex flex-col gap-4">
                    {Object.entries(MENU_CATEGORY_META).map(([catKey, catMeta]) => {
                      const catItems = filteredMenu.filter(i => i.category === catKey);
                      if (!catItems.length) return null;
                      return (
                        <div key={catKey}>
                          <div className="flex items-center gap-2 mb-2">
                            <span>{catMeta.emoji}</span>
                            <span className="text-xs font-bold uppercase tracking-widest" style={{ color: "var(--text-muted)" }}>
                              {catMeta.label}
                            </span>
                            <div className="flex-1 h-px ml-1" style={{ background: "var(--border)" }} />
                          </div>
                          <div className="flex flex-col gap-2">
                            {catItems.map(item => {
                              const sel = selectedItems.find(s => s.item_id === item.id);
                              const qty = sel?.quantity || 0;
                              const maxQty = getMaxAvailableQty(item.id, recipeItems, stockByIngredient);
                              const outOfStock = maxQty <= 0;
                              const atLimit = qty >= maxQty;
                              return (
                                <div key={item.id}
                                  className="flex items-center justify-between px-3 py-2.5 rounded-xl transition-colors"
                                  style={{
                                    background: outOfStock ? "rgba(239,68,68,0.06)" : qty > 0 ? "rgba(99,102,241,0.08)" : "var(--surface-2)",
                                    border: outOfStock ? "1px solid rgba(239,68,68,0.3)" : qty > 0 ? "1.5px solid var(--primary)" : "1px solid var(--border)",
                                    opacity: outOfStock ? 0.7 : 1,
                                  }}>
                                  <div className="flex items-center gap-2.5 min-w-0">
                                    <span style={{ fontSize: 20 }}>{getItemEmoji(item.name)}</span>
                                    <div className="min-w-0">
                                      <p className="text-sm font-semibold truncate" style={{ color: "var(--text)" }}>{item.name}</p>
                                      <p className="text-xs font-semibold" style={{ color: outOfStock ? "#ef4444" : "var(--primary)" }}>
                                        {outOfStock ? "Sem stock" : `${Number(item.price).toFixed(2)} €`}
                                      </p>
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-2 flex-shrink-0">
                                    {qty > 0 && (
                                      <>
                                        <button type="button" onClick={() => updateQty(item.id, qty - 1)}
                                          className="w-7 h-7 rounded-full flex items-center justify-center font-bold text-sm"
                                          style={{ background: "var(--surface)", color: "var(--text)", border: "1px solid var(--border)" }}>
                                          −
                                        </button>
                                        <span className="text-sm font-bold w-5 text-center" style={{ color: "var(--primary)" }}>{qty}</span>
                                      </>
                                    )}
                                    <button type="button" onClick={() => addItem(item)} disabled={atLimit}
                                      title={atLimit ? "Sem stock suficiente" : undefined}
                                      className="w-7 h-7 rounded-full flex items-center justify-center font-bold text-sm text-white disabled:cursor-not-allowed"
                                      style={{ background: atLimit ? "var(--text-muted)" : "var(--primary)", opacity: atLimit ? 0.5 : 1 }}>
                                      +
                                    </button>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
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
function OrderRow({ order, invoiceMap }) {
  const total = invoiceMap?.[order.id]?.total_amount;
  return (
    <tr className="border-b border-[var(--border)] transition-colors hover:bg-[var(--surface-2)]">
      <td className="py-3 px-4 text-sm font-semibold" style={{ color: "var(--primary)" }}>#{order.id}</td>
      <td className="py-3 px-4 text-sm">{getOrderTarget(order)}</td>
      <td className="py-3 px-4 text-sm">{getOrderClientName(order)}</td>
      <td className="py-3 px-4"><StatusBadge status={order.order_status} /></td>
      <td className="py-3 px-4 text-sm text-center">{getOrderItemCount(order)}</td>
      <td className="py-3 px-4 text-sm font-semibold">{total ? fmtEur(total) : "—"}</td>
      <td className="py-3 px-4 text-sm" style={{ color: "var(--text-secondary)" }}>{formatTime(order.created_at)}</td>
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
          {fmtEur(order.total_amount)}
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
  const [invoiceMap,  setInvoiceMap]  = useState({});
  const [loading,     setLoading]     = useState(true);
  const [error,       setError]       = useState(null);
  const [tab,         setTab]         = useState("all");
  const [search,      setSearch]      = useState("");
  const [showSearch,  setShowSearch]  = useState(false);
  const [page,        setPage]        = useState(1);
  const [showCreate,  setShowCreate]  = useState(false);
  const [sortCol, setSortCol] = useState(null);
  const [sortDir, setSortDir] = useState("asc");
  const handleSort = (col) => {
    if (sortCol === col) setSortDir(d => d === "asc" ? "desc" : "asc");
    else { setSortCol(col); setSortDir("asc"); }
  };

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [res, invoices] = await Promise.all([
        orderService.getAll(),
        invoiceService.getAll().catch(() => []),
      ]);
      const rows = Array.isArray(res) ? res : [];
      setOrders(rows);
      const map = {};
      if (Array.isArray(invoices)) invoices.forEach(inv => { if (inv.order_id) map[inv.order_id] = inv; });
      setInvoiceMap(map);
    } catch (err) {
      console.error(err);
      setError("Não foi possível carregar os pedidos. Tente novamente.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    const id = setInterval(load, 30_000);
    return () => clearInterval(id);
  }, [load]);
  useEffect(() => { setPage(1); }, [tab, search]);

  const counts   = useMemo(() => countOrdersByStatus(orders), [orders]);
  const filtered = useMemo(() => {
    const base = filterOrders(orders, { tab, search });
    if (!sortCol) return base;
    return [...base].sort((a, b) => {
      let va, vb;
      if (sortCol === "id")     { va = a.id;                       vb = b.id; }
      if (sortCol === "mesa")   { va = a.table_id ?? 0;            vb = b.table_id ?? 0; }
      if (sortCol === "client") { va = (a.user_name ?? "").toLowerCase(); vb = (b.user_name ?? "").toLowerCase(); }
      if (sortCol === "status") { va = a.order_status ?? "";       vb = b.order_status ?? ""; }
      if (sortCol === "items")  { va = getOrderItemCount(a);       vb = getOrderItemCount(b); }
      if (sortCol === "valor")  { va = Number(invoiceMap[a.id]?.total_amount ?? 0); vb = Number(invoiceMap[b.id]?.total_amount ?? 0); }
      if (sortCol === "hora")   { va = new Date(a.created_at).getTime(); vb = new Date(b.created_at).getTime(); }
      if (va < vb) return sortDir === "asc" ? -1 : 1;
      if (va > vb) return sortDir === "asc" ?  1 : -1;
      return 0;
    });
  }, [orders, tab, search, sortCol, sortDir, invoiceMap]);
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
        <div className="flex items-center justify-between gap-3 mb-4">
          <div>
            <h2 className="text-xl sm:text-2xl font-bold" style={{ color: "var(--text)" }}>Pedidos</h2>
            <p className="mt-1 text-sm" style={{ color: "var(--text-secondary)" }}>Todos os pedidos activos e histórico.</p>
          </div>
          <button onClick={() => setShowCreate(true)}
            className="flex items-center gap-1.5 rounded-xl px-3 sm:px-4 py-2 text-xs sm:text-sm font-semibold text-white whitespace-nowrap flex-shrink-0"
            style={{ background: "var(--primary)" }}>
            <i className="fa-solid fa-plus text-[10px] sm:text-xs" />
            Novo Pedido
          </button>
        </div>

        {/* ── Status Tabs ── */}
        <div className="flex items-center justify-center gap-2 sm:gap-1.5 mb-4">
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

        {/* ── Search — estilo ClientesPage ── */}
        <div className="flex items-center gap-2 mb-5">
          {showSearch && (
            <input autoFocus type="text" placeholder="Pesquisar..."
              value={search} onChange={e => setSearch(e.target.value)}
              className="flex-1 h-9 rounded-xl px-3 text-sm outline-none"
              style={{ background: "var(--surface-2)", border: "1px solid var(--border)", color: "var(--text)" }}
            />
          )}
          <div className="ml-auto flex items-center gap-2">
            <span className="hidden sm:inline-flex text-xs px-3 py-1 rounded-full border"
              style={{ color: "var(--text-muted)", borderColor: "var(--border)", background: "var(--surface-2)" }}>
              Filtro: {ORDER_TABS.find(t => t.key === tab)?.label ?? "Todos"}
            </span>
            <button onClick={() => { setShowSearch(s => !s); setSearch(""); }}
              className="w-8 h-8 rounded-lg border flex items-center justify-center cursor-pointer transition-colors"
              style={{ background: showSearch ? "var(--primary)" : "var(--surface)", borderColor: showSearch ? "var(--primary)" : "var(--border)", color: showSearch ? "#fff" : "var(--text-muted)" }}
              title={showSearch ? "Fechar pesquisa" : "Pesquisar"}>
              <i className={`fa-solid ${showSearch ? "fa-xmark" : "fa-magnifying-glass"} text-xs`} />
            </button>
          </div>
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
                    <SortTh col="id"     sortCol={sortCol} sortDir={sortDir} onSort={handleSort}>ID</SortTh>
                    <SortTh col="mesa"   sortCol={sortCol} sortDir={sortDir} onSort={handleSort}>Mesa</SortTh>
                    <SortTh col="client" sortCol={sortCol} sortDir={sortDir} onSort={handleSort}>Cliente</SortTh>
                    <SortTh col="status" sortCol={sortCol} sortDir={sortDir} onSort={handleSort}>Estado</SortTh>
                    <SortTh col="items"  sortCol={sortCol} sortDir={sortDir} onSort={handleSort}>Itens</SortTh>
                    <SortTh col="valor"  sortCol={sortCol} sortDir={sortDir} onSort={handleSort}>Valor</SortTh>
                    <SortTh col="hora"   sortCol={sortCol} sortDir={sortDir} onSort={handleSort}>Hora</SortTh>
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
                    pageData.map(o => <OrderRow key={o.id} order={o} invoiceMap={invoiceMap} />)
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
