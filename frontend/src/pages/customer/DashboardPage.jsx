import { useEffect, useMemo, useState } from "react";
import { Doughnut, Line } from "react-chartjs-2";
import { Chart as ChartJS, ArcElement, CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Legend, Filler } from "chart.js";
import { useAuth } from "@/context/AuthContext";
import { orderService } from "@/services/orderService";
import { invoiceService } from "@/services/invoiceService";
import { itemService } from "@/services/itemService";
import { fmtEur } from "@/utils/dashboardUtils";
import { ORDER_STATUS_META, getOrderTarget, ORDER_TABS, getOrderItemCount } from "@/utils/orderUtils";
import { TrophySpin } from "@/components/ui";
import CustomerStatsCard from "@/components/ui/customer/CustomerStatsCard";

ChartJS.register(ArcElement, CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Legend, Filler);

function StatusSummary({ counts }) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
      {Object.entries(counts).map(([status, value]) => {
        const meta = ORDER_STATUS_META[status] || { label: status, bg: "#f3f4f6", text: "#374151" };
        return (
          <div key={status} className="rounded-2xl p-4" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
            <p className="text-[10px] uppercase tracking-widest font-semibold" style={{ color: "var(--text-muted)" }}>{meta.label}</p>
            <p className="mt-2 text-xl font-bold" style={{ color: meta.text }}>{value}</p>
          </div>
        );
      })}
    </div>
  );
}

export default function CustomerDashboardPage() {
  const { user } = useAuth();
  const [orders, setOrders] = useState([]);
  const [invoiceMap, setInvoiceMap] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.id) return;

    let canceled = false;
    orderService.getByCustomer(user.id)
      .then((list) => {
        const rows = Array.isArray(list) ? list : [];
        if (canceled) return;
        setOrders(rows);
        return Promise.all(rows.map((order) =>
          invoiceService.getByOrder(order.id)
            .then((inv) => [order.id, inv])
            .catch(() => [order.id, null])
        ));
      })
      .then((pairs) => {
        if (!canceled && pairs) setInvoiceMap(Object.fromEntries(pairs));
      })
      .finally(() => { if (!canceled) setLoading(false); });

    return () => { canceled = true; };
  }, [user?.id]);

  const totalOrders = orders.length;
  const totalSpent = useMemo(() => orders.reduce((sum, order) => {
    const inv = invoiceMap[order.id];
    return sum + Number(inv?.total_amount || 0);
  }, 0), [orders, invoiceMap]);

  const avgOrder = totalOrders > 0 ? totalSpent / totalOrders : 0;
  const statusCounts = useMemo(() => {
    return orders.reduce((acc, order) => {
      acc[order.order_status] = (acc[order.order_status] || 0) + 1;
      return acc;
    }, {});
  }, [orders]);

  const categoryTotals = useMemo(() => {
    const totals = {};
    orders.forEach((order) => {
      const items = getOrderItemCount(order);
      const category = order.category || "Outros";
      totals[category] = (totals[category] || 0) + items;
    });
    return totals;
  }, [orders]);

  const doughnutData = useMemo(() => ({
    labels: Object.keys(statusCounts),
    datasets: [{
      data: Object.values(statusCounts),
      backgroundColor: ["#60a5fa", "#f59e0b", "#22c55e", "#7c3aed", "#14b8a6", "#ef4444"],
      borderWidth: 1,
    }],
  }), [statusCounts]);

  const lineData = useMemo(() => ({
    labels: Object.keys(categoryTotals),
    datasets: [{
      label: "Itens por categoria",
      data: Object.values(categoryTotals),
      backgroundColor: "rgba(99,102,241,0.15)",
      borderColor: "#6366F1",
      borderWidth: 2,
      fill: true,
      tension: 0.4,
    }],
  }), [categoryTotals]);

  const sortedOrders = useMemo(() => [...orders].sort((a, b) => new Date(b.created_at) - new Date(a.created_at)), [orders]);

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
            <p className="text-xs uppercase tracking-[0.2em] font-semibold" style={{ color: "var(--text-muted)" }}>Dashboard do cliente</p>
            <h1 className="text-2xl font-bold" style={{ color: "var(--text)" }}>As tuas despesas</h1>
          </div>
          <div className="text-sm text-[var(--text-muted)]">
            {totalOrders} pedidos registados · {fmtEur(totalSpent)} gastos
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <CustomerStatsCard label="Total gasto" value={fmtEur(totalSpent)} sub="Somatório de todas as faturas" />
          <CustomerStatsCard label="Pedidos" value={totalOrders} sub="Todos os pedidos gerados" />
          <CustomerStatsCard label="Valor médio" value={fmtEur(avgOrder)} sub="Por pedido" />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="rounded-2xl p-5" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm font-semibold" style={{ color: "var(--text)" }}>Pedidos por estado</p>
            </div>
            <div style={{ minHeight: 260 }}>
              <Doughnut data={doughnutData} options={{ responsive: true, plugins: { legend: { position: "bottom" } } }} />
            </div>
          </div>
          <div className="rounded-2xl p-5" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm font-semibold" style={{ color: "var(--text)" }}>Pedidos recentes</p>
            </div>
            <div className="space-y-3">
              {sortedOrders.slice(0, 5).map((order) => (
                <div key={order.id} className="rounded-2xl p-4" style={{ background: "var(--bg)", border: "1px solid var(--border)" }}>
                  <div className="flex items-center justify-between gap-3 mb-2">
                    <span className="text-sm font-semibold" style={{ color: "var(--text)" }}>#{order.id}</span>
                    <span className="text-xs uppercase font-semibold" style={{ color: ORDER_STATUS_META[order.order_status]?.text ?? "var(--text)" }}>
                      {ORDER_STATUS_META[order.order_status]?.label || order.order_status}
                    </span>
                  </div>
                  <p className="text-sm" style={{ color: "var(--text-muted)" }}>{getOrderTarget(order)}</p>
                  <p className="mt-2 text-sm font-semibold" style={{ color: "var(--text)" }}>{fmtEur(invoiceMap[order.id]?.total_amount)}</p>
                </div>
              ))}
              {sortedOrders.length === 0 && (
                <p className="text-sm text-[var(--text-muted)]">Ainda não há pedidos para mostrar.</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
