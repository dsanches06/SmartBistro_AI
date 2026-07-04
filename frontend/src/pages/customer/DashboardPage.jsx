import { useCallback, useEffect, useMemo, useState } from "react";
import { Doughnut } from "react-chartjs-2";
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from "chart.js";
import { useAuth } from "@/context/AuthContext";
import { orderService } from "@/services/orderService";
import { invoiceService } from "@/services/invoiceService";
import { fmtEur } from "@/utils/dashboardUtils";
import { ORDER_STATUS_META, getOrderTarget } from "@/utils/orderUtils";
import { TrophySpin, Modal } from "@/components/ui";
import CustomerStatsCard from "@/components/ui/customer/CustomerStatsCard";

ChartJS.register(ArcElement, Tooltip, Legend);

function parseOrderItems(kitchenJson) {
  try {
    const raw = typeof kitchenJson === 'string' ? JSON.parse(kitchenJson) : kitchenJson;
    if (!Array.isArray(raw) || raw.length === 0) return [];
    // Chef AI format: ["Prato 1", "Prato 2"]
    if (typeof raw[0] === 'string') return raw.map(name => ({ name, quantity: null, price: null }));
    // Cardápio format: [{name, quantity, price}]
    return raw;
  } catch { return []; }
}

function OrderDetailModal({ order, amount, onClose }) {
  const items = parseOrderItems(order.kitchen_sequence_json);

  const title = (
    <span>
      <span className="block text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>
        {order.service_type ?? "Takeaway"}
      </span>
      <span className="block text-base font-bold" style={{ color: "var(--text)" }}>Pedido #{order.id}</span>
    </span>
  );

  return (
    <Modal open onClose={onClose} title={title} size="sm">
      <div className="space-y-2 max-h-64 overflow-y-auto -mt-2">
        {items.length === 0 ? (
          <p className="text-sm text-center" style={{ color: "var(--text-muted)" }}>Sem itens disponíveis.</p>
        ) : items.map((item, i) => (
          <div key={i} className="flex items-center justify-between gap-3 py-1.5 border-b last:border-0" style={{ borderColor: "var(--border)" }}>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate" style={{ color: "var(--text)" }}>{item.name}</p>
              {item.quantity != null && (
                <p className="text-xs" style={{ color: "var(--text-muted)" }}>x{item.quantity}</p>
              )}
            </div>
            {item.price != null && item.quantity != null && (
              <span className="text-sm font-semibold flex-shrink-0" style={{ color: "var(--primary)" }}>
                {(Number(item.price) * Number(item.quantity)).toFixed(2)} €
              </span>
            )}
          </div>
        ))}
      </div>

      <div className="mt-3 rounded-xl px-4 py-3 flex items-center justify-between" style={{ background: "var(--surface-2)" }}>
        <span className="text-sm font-semibold" style={{ color: "var(--text-muted)" }}>Total pago</span>
        <span className="text-lg font-bold" style={{ color: "var(--primary)" }}>
          {amount ? `${Number(amount).toFixed(2)} €` : "—"}
        </span>
      </div>

      <button
        onClick={onClose}
        className="w-full mt-3 py-2.5 rounded-xl text-sm font-semibold"
        style={{ background: "var(--surface-2)", color: "var(--text-secondary)", border: "1px solid var(--border)" }}
      >
        Fechar
      </button>
    </Modal>
  );
}

export default function CustomerDashboardPage() {
  const { user } = useAuth();
  const [orders, setOrders] = useState([]);
  const [invoiceMap, setInvoiceMap] = useState({});
  const [totalSpent, setTotalSpent] = useState(0);
  const [paidCount, setPaidCount] = useState(0);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!user?.id) return;
    try {
      const list = await orderService.getByUser(user.id).catch(() => []);
      const rows = Array.isArray(list) ? list : [];
      setOrders(rows);

      // Busca faturas e pagamentos para cada pedido
      const invoicePairs = await Promise.all(
        rows.map(order =>
          invoiceService.getByOrder(order.id)
            .then(inv => [order.id, inv])
            .catch(() => [order.id, null])
        )
      );
      const invMap = Object.fromEntries(invoicePairs);
      setInvoiceMap(invMap);

      // Total gasto = soma de todas as faturas do cliente
      // (se existe fatura, o pedido passou pelo checkout/pagamento)
      let total = 0;
      let paid = 0;
      Object.values(invMap).forEach(inv => {
        if (inv?.total_amount) {
          total += Number(inv.total_amount);
          paid++;
        }
      });
      setTotalSpent(total);
      setPaidCount(paid);
    } catch { /* silent */ }
    finally { setLoading(false); }
  }, [user?.id]);

  useEffect(() => {
    load();
    const id = setInterval(load, 30_000);
    return () => clearInterval(id);
  }, [load]);

  const totalOrders = orders.length;
  const avgOrder = paidCount > 0 ? totalSpent / paidCount : 0;
  const typeCounts = useMemo(() => {
    return orders.reduce((acc, order) => {
      const t = order.service_type || "Takeaway";
      acc[t] = (acc[t] || 0) + 1;
      return acc;
    }, {});
  }, [orders]);

  const doughnutData = useMemo(() => ({
    labels: Object.keys(typeCounts),
    datasets: [{
      data: Object.values(typeCounts),
      backgroundColor: ["#60a5fa", "#f59e0b"],
      borderWidth: 1,
    }],
  }), [typeCounts]);

  const [recentPage, setRecentPage]             = useState(1);
  const [selectedRecentOrder, setSelectedRecentOrder] = useState(null);
  const RECENT_PER_PAGE = 10;

  const sortedOrders = useMemo(() => [...orders].sort((a, b) => new Date(b.created_at) - new Date(a.created_at)), [orders]);
  const recentPageCount = Math.max(1, Math.ceil(sortedOrders.length / RECENT_PER_PAGE));
  const recentOrders = useMemo(() => {
    const start = (recentPage - 1) * RECENT_PER_PAGE;
    return sortedOrders.slice(start, start + RECENT_PER_PAGE);
  }, [sortedOrders, recentPage]);

  if (!user) return null;
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen" style={{ background: "var(--bg)" }}>
        <TrophySpin message="A carregar estatísticas..." />
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ background: "var(--bg)" }}>
      <div className="w-full max-w-[1100px] mx-auto px-4 sm:px-6 py-6 space-y-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="text-2xl font-bold" style={{ color: "var(--text)" }}>Minhas Despesas</h2>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <CustomerStatsCard label="Total gasto" value={fmtEur(totalSpent)} sub="Total das faturas pagas" />
          <CustomerStatsCard label="Meus Pedidos" value={totalOrders} sub="Total de pedidos realizados" />
          <CustomerStatsCard label="Valor médio" value={fmtEur(avgOrder)} sub="Valor médio por pedido" />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="rounded-2xl p-5" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm font-semibold" style={{ color: "var(--text)" }}>Pedidos por tipo</p>
            </div>
            <div style={{ minHeight: 260 }}>
              <Doughnut data={doughnutData} options={{ responsive: true, plugins: { legend: { position: "bottom" } } }} />
            </div>
          </div>
          <div className="rounded-2xl p-5" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm font-semibold" style={{ color: "var(--text)" }}>Pedidos recentes</p>
              {recentPageCount > 1 && (
                <div className="flex items-center gap-1">
                  <button onClick={() => setRecentPage(p => Math.max(1, p - 1))} disabled={recentPage === 1}
                    className="w-6 h-6 rounded-lg flex items-center justify-center disabled:opacity-30"
                    style={{ background: "var(--surface-2)" }}>
                    <i className="fa-solid fa-chevron-left text-[10px]" style={{ color: "var(--text-muted)" }} />
                  </button>
                  <span className="text-[10px]" style={{ color: "var(--text-muted)" }}>{recentPage}/{recentPageCount}</span>
                  <button onClick={() => setRecentPage(p => Math.min(recentPageCount, p + 1))} disabled={recentPage === recentPageCount}
                    className="w-6 h-6 rounded-lg flex items-center justify-center disabled:opacity-30"
                    style={{ background: "var(--surface-2)" }}>
                    <i className="fa-solid fa-chevron-right text-[10px]" style={{ color: "var(--text-muted)" }} />
                  </button>
                </div>
              )}
            </div>
            <div className="space-y-1.5">
              {recentOrders.map((order) => {
                const meta = ORDER_STATUS_META[order.order_status];
                const amount = invoiceMap[order.id]?.total_amount;
                return (
                  <button
                    key={order.id}
                    onClick={() => setSelectedRecentOrder({ order, amount })}
                    className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-left transition-colors hover:bg-[var(--surface-2)]"
                    style={{ background: "var(--bg)", border: "1px solid var(--border)" }}
                  >
                    <span className="text-xs font-bold w-8 flex-shrink-0" style={{ color: "var(--primary)" }}>#{order.id}</span>
                    <span className="text-xs flex-1 truncate" style={{ color: "var(--text-muted)" }}>{getOrderTarget(order)}</span>
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full flex-shrink-0" style={{ background: meta?.bg, color: meta?.text }}>
                      {meta?.label || order.order_status}
                    </span>
                    <span className="text-xs font-semibold flex-shrink-0 w-16 text-right" style={{ color: "var(--text)" }}>
                      {amount ? fmtEur(amount) : "—"}
                    </span>
                  </button>
                );
              })}
              {sortedOrders.length === 0 && (
                <p className="text-sm text-[var(--text-muted)]">Ainda não há pedidos para mostrar.</p>
              )}
            </div>
          </div>
        </div>
      </div>

      {selectedRecentOrder && (
        <OrderDetailModal
          order={selectedRecentOrder.order}
          amount={selectedRecentOrder.amount}
          onClose={() => setSelectedRecentOrder(null)}
        />
      )}
    </div>
  );
}
