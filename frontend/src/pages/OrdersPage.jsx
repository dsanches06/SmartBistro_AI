import { useCallback, useEffect, useMemo, useState } from "react";
import { PageSection, Pagination, ListCard } from "@/components";
import { orderService } from "@/services";
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
  const [orders,  setOrders]  = useState([]);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState(null);
  const [tab,     setTab]     = useState("all");
  const [search,  setSearch]  = useState("");
  const [page,    setPage]    = useState(1);

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

        {/* ── Header ── */}
        <div className="flex items-center justify-between mb-5">
          <h1 className="text-2xl font-bold" style={{ color: "var(--text)" }}>Pedidos</h1>
          <button
            onClick={load}
            title="Atualizar"
            className="w-9 h-9 inline-flex items-center justify-center rounded-xl border border-[var(--border)] transition-colors"
            style={{ color: "var(--text-secondary)", background: "var(--surface-2)" }}
          >
            <i className={`fa-solid fa-rotate-right text-sm${loading ? " fa-spin" : ""}`} />
          </button>
        </div>

        {/* ── Status Tabs ── */}
        <div
          className="flex gap-1.5 mb-4 overflow-x-auto pb-0.5"
          style={{ scrollbarWidth: "none" }}
        >
          {ORDER_TABS.map(({ key, label }) => {
            const active = tab === key;
            const count  = counts[key] ?? 0;
            return (
              <button
                key={key}
                onClick={() => setTab(key)}
                className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-semibold transition-all whitespace-nowrap flex-shrink-0"
                style={{
                  background: active ? "var(--primary)" : "var(--surface-2)",
                  color: active ? "#fff" : "var(--text-secondary)",
                  boxShadow: active ? "0 2px 8px rgba(0,0,0,0.12)" : "none",
                }}
              >
                {label}
                {key !== "all" && count > 0 && (
                  <span
                    className="rounded-full px-1.5 py-0.5 text-[10px] font-bold leading-none"
                    style={{
                      background: active ? "rgba(255,255,255,0.3)" : "var(--primary)",
                      color: "#fff",
                    }}
                  >
                    {count}
                  </span>
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
              placeholder="Pesquisar pedido, mesa ou cliente"
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
