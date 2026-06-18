import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { orderService } from "@/services/orderService";
import { invoiceService } from "@/services/invoiceService";
import { getOrderTarget, getOrderItemCount, ORDER_TABS, filterOrders, ORDER_STATUS_META, getOrderSteps, getOrderStepIndex } from "@/utils/orderUtils";
import { TrophySpin, OrderStatusModal } from "@/components/ui";

// Página que mostra a lista de pedidos do cliente.
export default function CustomerOrdersPage() {
  const { user } = useAuth();
  const [orders, setOrders] = useState([]);
  const [invoiceMap, setInvoiceMap] = useState({});
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("all");
  const [search, setSearch] = useState("");
  const [selectedOrder, setSelectedOrder] = useState(null);

  useEffect(() => {
    if (!user?.id) return;
    let canceled = false;

    orderService.getByCustomer(user.id)
      .then((list) => {
        const rows = Array.isArray(list) ? list : [];
        if (canceled) return;
        setOrders(rows);
        return Promise.all(rows.map((order) =>
          invoiceService.getByOrder(order.id).then((inv) => [order.id, inv]).catch(() => [order.id, null])
        ));
      })
      .then((pairs) => { if (!canceled && pairs) setInvoiceMap(Object.fromEntries(pairs)); })
      .finally(() => { if (!canceled) setLoading(false); });

    return () => { canceled = true; };
  }, [user?.id]);

  const filteredOrders = useMemo(() => filterOrders(orders, { tab, search }), [orders, tab, search]);

  const handleViewState = (order) => {
    setSelectedOrder(order);
  };

  if (!user) return null;
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen" style={{ background: "var(--bg)" }}>
        <TrophySpin message="A carregar pedidos..." />
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ background: "var(--bg)" }}>
      <div className="w-full max-w-[1100px] mx-auto px-4 sm:px-6 py-6 space-y-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] font-semibold" style={{ color: "var(--text-muted)" }}>Pedidos</p>
            <h1 className="text-2xl font-bold" style={{ color: "var(--text)" }}>Os teus pedidos</h1>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Pesquisar pedidos..."
              className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] px-4 py-2 text-sm outline-none"
              style={{ color: "var(--text)" }}
            />
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          {ORDER_TABS.map((tabItem) => (
            <button
              key={tabItem.key}
              onClick={() => setTab(tabItem.key)}
              className={`rounded-2xl px-4 py-2 text-sm font-semibold ${tab === tabItem.key ? "bg-[var(--primary)] text-white" : "bg-[var(--surface)] text-[var(--text)]"}`}
            >
              {tabItem.label}
            </button>
          ))}
        </div>

        <div className="overflow-x-auto rounded-2xl bg-[var(--surface)] border border-[var(--border)]">
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead>
              <tr className="border-b" style={{ borderColor: "var(--border)" }}>
                {['ID', 'Destino', 'Estado', 'Itens', 'Total', 'Hora'].map((header) => (
                  <th key={header} className="px-4 py-3 uppercase tracking-[0.08em] text-[10px] font-semibold" style={{ color: "var(--text-muted)" }}>{header}</th>
                ))}
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {filteredOrders.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-sm" style={{ color: "var(--text-muted)" }}>
                    Não existem pedidos para este filtro.
                  </td>
                </tr>
              ) : filteredOrders.map((order) => (
                <tr key={order.id} className="border-b last:border-b-0 hover:bg-[var(--surface-2)]" style={{ borderColor: "var(--border)" }}>
                  <td className="px-4 py-4 font-semibold" style={{ color: "var(--primary)" }}>#{order.id}</td>
                  <td className="px-4 py-4" style={{ color: "var(--text)" }}>{getOrderTarget(order)}</td>
                  <td className="px-4 py-4"><span className="rounded-full px-3 py-1 text-[11px] font-semibold" style={{ background: ORDER_STATUS_META[order.order_status]?.bg, color: ORDER_STATUS_META[order.order_status]?.text }}>{ORDER_STATUS_META[order.order_status]?.label || order.order_status}</span></td>
                  <td className="px-4 py-4" style={{ color: "var(--text)" }}>{getOrderItemCount(order)}</td>
                  <td className="px-4 py-4 font-semibold" style={{ color: "var(--text)" }}>{invoiceMap[order.id]?.total_amount ? `€${Number(invoiceMap[order.id].total_amount).toFixed(2)}` : "—"}</td>
                  <td className="px-4 py-4" style={{ color: "var(--text-muted)" }}>{new Date(order.created_at).toLocaleString("pt-PT", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" })}</td>
                  <td className="px-4 py-4">
                    <button
                      type="button"
                      onClick={() => handleViewState(order)}
                      className="inline-flex items-center justify-center rounded-xl border border-[var(--border)] bg-[var(--surface)] p-2 text-[var(--text)] transition hover:border-[var(--primary)] hover:text-[var(--primary)]"
                      aria-label={`Ver estado do pedido #${order.id}`}
                    >
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                        <circle cx="12" cy="12" r="3" />
                      </svg>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      {selectedOrder && (
        <OrderStatusModal order={selectedOrder} onClose={() => setSelectedOrder(null)} />
      )}
    </div>
  );
}
