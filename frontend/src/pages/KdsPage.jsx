import { useEffect, useMemo, useState } from "react";
import { PageSection } from "@/components";
import { orderService } from "@/services";
import { KDS_STATUS_COLUMNS, mapDisplayStatus, formatTime } from "@/utils";
import { useTheme } from "@/context/ThemeContext";

const STATUS_ICON = {
  Pending:          "🆕",
  "In Preparation": "🔄",
  Ready:            "✅",
  Delivered:        "🚀",
};

/* ── Order card ── */
function OrderCard({ order, cardBorder }) {
  const target = order.table_id ? `Mesa ${order.table_id}` : "Takeaway";

  return (
    <div
      style={{
        backgroundColor: "var(--surface-2)",
        borderLeft: `4px solid ${cardBorder}`,
        borderRadius: "0.5rem",
        padding: "10px 12px",
        boxShadow: "0 1px 3px rgba(0,0,0,0.08)",
        transition: "transform 0.15s, box-shadow 0.15s",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = "translateY(-2px)";
        e.currentTarget.style.boxShadow = "0 4px 10px rgba(0,0,0,0.12)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = "none";
        e.currentTarget.style.boxShadow = "0 1px 3px rgba(0,0,0,0.08)";
      }}
    >
      {/* ID + Mesa */}
      <p style={{ fontSize: 12, fontWeight: 600, color: "var(--text-secondary)", marginBottom: 2 }}>
        #{order.id} · {target}
      </p>

      {/* Nome do cliente */}
      <p style={{ fontSize: 14, fontWeight: 700, color: "var(--text)", marginBottom: 8 }}>
        Cliente {order.customer_id ?? "—"}
      </p>

      {/* Itens */}
      <div style={{ display: "flex", flexDirection: "column", gap: 2, marginBottom: 8 }}>
        {order.kitchenItems.slice(0, 4).map((name, i) => (
          <span key={i} style={{ fontSize: 12, color: "var(--text-secondary)" }}>
            1x {name}
          </span>
        ))}
        {order.kitchenItems.length > 4 && (
          <span style={{ fontSize: 11, color: "var(--text-muted)" }}>
            +{order.kitchenItems.length - 4} mais
          </span>
        )}
      </div>

      {/* Rodapé: status + hora */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <span style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", color: cardBorder }}>
          {order.order_status}
        </span>
        <span style={{ fontSize: 11, color: "var(--text-muted)" }}>
          {formatTime(order.created_at)}
        </span>
      </div>
    </div>
  );
}

/* ── KDS Page ── */
export default function KdsPage() {
  const { theme } = useTheme();
  const isDark = theme === "dark";

  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function loadData() {
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
    }
    loadData();
  }, []);

  const ordersWithDetails = useMemo(() =>
    orders
      .filter((o) => o.order_status && o.order_status !== "Cancelled")
      .map((o) => {
        const kitchenItems = Array.isArray(o.kitchen_sequence_json)
          ? o.kitchen_sequence_json
          : (() => {
              try { return JSON.parse(o.kitchen_sequence_json); }
              catch { return []; }
            })();
        return { ...o, kitchenItems, displayStatus: mapDisplayStatus(o.order_status) };
      }),
    [orders],
  );

  const groupedOrders = useMemo(
    () =>
      KDS_STATUS_COLUMNS.reduce((acc, col) => {
        acc[col.status] = ordersWithDetails.filter((o) => o.displayStatus === col.status);
        return acc;
      }, {}),
    [ordersWithDetails],
  );

  return (
    <PageSection title="KDS" description="Visão da cozinha e pedidos em produção">
      <div className="rounded-[32px] bg-surface p-6 shadow-sm">
        <div className="mb-6">
          <h1 className="text-xl font-semibold">KDS — Cozinha</h1>
          <p className="mt-1 text-sm text-[var(--text-secondary)]">
            Pedidos e estado atual carregados direto da base de dados.
          </p>
        </div>

        {loading ? (
          <div className="rounded-3xl bg-surface-2 p-6 text-center text-[var(--text-secondary)]">
            A carregar pedidos...
          </div>
        ) : error ? (
          <div className="rounded-3xl bg-red-50 p-6 text-center text-red-700">
            {error}
          </div>
        ) : (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 12, width: "100%" }}>
            {KDS_STATUS_COLUMNS.map((col) => {
              const colOrders = groupedOrders[col.status] || [];
              const colBg = isDark ? col.bgDark : col.bg;
              const labelColor = isDark ? "var(--text)" : "#374151";
              const emptyColor = isDark ? "rgba(255,255,255,0.18)" : "rgba(0,0,0,0.18)";

              return (
                <div
                  key={col.status}
                  style={{
                    flex: "1 1 220px",
                    minWidth: 220,
                    borderRadius: 12,
                    overflow: "hidden",
                    border: isDark ? "1px solid rgba(255,255,255,0.06)" : "1px solid rgba(0,0,0,0.06)",
                    boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
                  }}
                >
                  {/* Cabeçalho da coluna */}
                  <div
                    style={{
                      backgroundColor: colBg,
                      padding: "10px 12px",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      borderBottom: isDark ? "1px solid rgba(255,255,255,0.06)" : "1px solid rgba(0,0,0,0.06)",
                    }}
                  >
                    <span style={{ fontSize: 12, fontWeight: 700, letterSpacing: "0.05em", color: labelColor }}>
                      {STATUS_ICON[col.status]} {col.title}
                    </span>
                    <span
                      style={{
                        backgroundColor: col.cardBorder,
                        color: "#fff",
                        borderRadius: "50%",
                        width: 22,
                        height: 22,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: 11,
                        fontWeight: 700,
                        flexShrink: 0,
                      }}
                    >
                      {colOrders.length}
                    </span>
                  </div>

                  {/* Corpo da coluna */}
                  <div
                    style={{
                      backgroundColor: colBg,
                      padding: 8,
                      minHeight: 160,
                      display: "flex",
                      flexDirection: "column",
                      gap: 8,
                    }}
                  >
                    {colOrders.map((order) => (
                      <OrderCard key={order.id} order={order} cardBorder={col.cardBorder} />
                    ))}
                    {colOrders.length === 0 && (
                      <p style={{ textAlign: "center", color: emptyColor, fontSize: 12, paddingTop: 20 }}>
                        —
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </PageSection>
  );
}
