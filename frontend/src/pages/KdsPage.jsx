import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { PageSection } from "@/components";
import { orderService } from "@/services";
import {
  KDS_STATUS_COLUMNS,
  KDS_STATUS_ICON,
  KDS_STATUS_TARGET_S,
  KDS_STATUS_ORDER,
  KDS_NEXT_STATUS,
  KDS_STATUS_TO_EVENT,
  makeKdsEvent,
  formatElapsed,
  kdsTimerColor,
  mapDisplayStatus,
  formatTime,
} from "@/utils";
import { useTheme } from "@/context/ThemeContext";


/* ── Ecrã de actividade ── */
function ActivityScreen({ events }) {
  const logRef = useRef(null);

  useEffect(() => {
    if (logRef.current) logRef.current.scrollTop = 0;
  }, [events.length]);

  return (
    <div
      style={{
        background: "var(--surface-2)",
        borderRadius: 12,
        border: "1px solid var(--border)",
        overflow: "hidden",
      }}
    >
      {/* Barra de título */}
      <div
        style={{
          background: "var(--surface)",
          padding: "6px 12px",
          display: "flex",
          alignItems: "center",
          gap: 6,
          borderBottom: "1px solid var(--border)",
        }}
      >
        <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#ef4444", display: "inline-block", flexShrink: 0 }} />
        <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#f59e0b", display: "inline-block", flexShrink: 0 }} />
        <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#22c55e", display: "inline-block", flexShrink: 0 }} />
        <span style={{ fontFamily: "monospace", fontSize: 10, color: "var(--text-muted)", marginLeft: 6, letterSpacing: "0.05em" }}>
          SmartBistro · Activity Log
        </span>
      </div>

      {/* Lista de eventos */}
      <div
        ref={logRef}
        style={{
          height: 72,
          overflowY: "scroll",
          padding: "5px 8px",
          display: "flex",
          flexDirection: "column",
          gap: 3,
          scrollbarWidth: "thin",
          scrollbarColor: "var(--border) transparent",
        }}
      >
        {events.length === 0 ? (
          <p style={{ color: "var(--text-muted)", fontSize: 11, textAlign: "center", paddingTop: 18, fontFamily: "monospace" }}>
            — a aguardar eventos —
          </p>
        ) : (
          events.map(evt => (
            <div
              key={evt.id}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                padding: "4px 8px",
                borderRadius: 6,
                background: "var(--surface)",
                border: `1px solid ${evt.color}30`,
              }}
            >
              <span style={{ fontSize: 12, flexShrink: 0 }}>{evt.icon}</span>
              <span style={{ color: "var(--text-muted)", fontSize: 9, fontFamily: "monospace", flexShrink: 0 }}>
                {evt.time}
              </span>
              <span style={{ color: evt.color, fontSize: 11, fontWeight: 600, lineHeight: 1.3 }}>
                {evt.message}
              </span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

/* ── Card de pedido ── */
function OrderCard({ order, cardBorder, now, firstSeenAt }) {
  const target      = order.table_id ? `Mesa ${order.table_id}` : "Takeaway";
  const refMs       = firstSeenAt.get(order.id) ?? now;
  const elapsed     = Math.max(0, Math.floor((now - refMs) / 1000));
  const tTarget     = KDS_STATUS_TARGET_S[order.order_status] ?? 0;
  const isDelivered = order.order_status === "Delivered";

  // Timer decrescente: conta a partir do alvo
  const remaining   = tTarget - elapsed;
  const isOverdue   = remaining < 0;
  const timerSecs   = Math.abs(remaining);
  const timerLabel  = (isOverdue ? "+" : "") + formatElapsed(timerSecs);
  const color       = isDelivered ? null
    : isOverdue     ? "#ef4444"
    : kdsTimerColor(elapsed, tTarget);

  return (
    <div
      style={{
        backgroundColor: "var(--surface-2)",
        borderLeft: `4px solid ${cardBorder}`,
        borderRadius: "0.5rem",
        padding: "10px 12px",
        boxShadow: "0 1px 3px rgba(0,0,0,0.08)",
        transition: "transform 0.15s, box-shadow 0.15s",
        display: "flex",
        flexDirection: "column",
        gap: 0,
      }}
      onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-2px)"; e.currentTarget.style.boxShadow = "0 4px 10px rgba(0,0,0,0.12)"; }}
      onMouseLeave={e => { e.currentTarget.style.transform = "none"; e.currentTarget.style.boxShadow = "0 1px 3px rgba(0,0,0,0.08)"; }}
    >
      <p style={{ fontSize: 12, fontWeight: 600, color: "var(--text-secondary)", marginBottom: 2 }}>
        #{order.id} · {target}
      </p>
      <p style={{ fontSize: 14, fontWeight: 700, color: "var(--text)", marginBottom: 6 }}>
        Cliente {order.customer_id ?? "—"}
      </p>
      <div style={{ display: "flex", flexDirection: "column", gap: 2, marginBottom: 8 }}>
        {order.kitchenItems.slice(0, 4).map((name, i) => (
          <span key={i} style={{ fontSize: 12, color: "var(--text-secondary)" }}>1x {name}</span>
        ))}
        {order.kitchenItems.length > 4 && (
          <span style={{ fontSize: 11, color: "var(--text-muted)" }}>+{order.kitchenItems.length - 4} mais</span>
        )}
      </div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        {!isDelivered && (
          <span style={{ fontFamily: "monospace", fontSize: 13, fontWeight: 700, color }} title={isOverdue ? "Tempo ultrapassado" : "Tempo restante"}>
            ⏱ {timerLabel}
          </span>
        )}
        <span style={{ fontSize: 11, color: "var(--text-muted)", marginLeft: "auto" }}>
          {formatTime(order.created_at)}
        </span>
      </div>
    </div>
  );
}

// ── Stores de nível de módulo — persistem enquanto a app estiver aberta ──────
// Sobrevivem a navegação (desmount/remount do componente), nunca são resetados
const _firstSeenAt      = new Map();  // orderId → timestamp de 1ª aparição no KDS
const _hiddenFromKanban = new Set();  // IDs removidos do kanban (não da DB)
const _statusOverrides  = new Map();  // orderId → status local mais avançado
const _autoAdvancing    = new Set();  // IDs em processo de auto-avanço

/* ── KDS Page ── */
export default function KdsPage() {
  const { theme } = useTheme();
  const isDark    = theme === "dark";

  const [orders,      setOrders]      = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [error,       setError]       = useState(null);
  const [now,         setNow]         = useState(() => Date.now());
  const [activityLog, setActivityLog] = useState([]);

  // Refs apontam para os stores de módulo → nunca resetam ao navegar
  const firstSeenAt        = useRef(_firstSeenAt);
  const hiddenFromKanban   = useRef(_hiddenFromKanban);
  const statusOverridesRef = useRef(_statusOverrides);
  const autoAdvancingRef   = useRef(_autoAdvancing);

  const prevOrdersRef = useRef([]);
  const isFirstLoad   = useRef(true);

  /* Tick global — 1 segundo */
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  /* Carregar pedidos + gerar eventos de actividade */
  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res  = await orderService.getAll();
      const raw  = Array.isArray(res) ? res : [];
      const ts   = Date.now();

      // Aplica overrides, filtra ocultos e ordens já entregues (Delivered não aparece no load)
      const list = raw
        .filter(o => !hiddenFromKanban.current.has(o.id))
        .map(o => {
          const override = statusOverridesRef.current.get(o.id);
          if (override && (KDS_STATUS_ORDER[override] ?? -1) > (KDS_STATUS_ORDER[o.order_status] ?? -1)) {
            return { ...o, order_status: override };
          }
          return o;
        })
        .filter(o => o.order_status !== "Delivered");

      /* firstSeenAt — registar novos IDs (mutação directa, não reseta ao navegar) */
      for (const o of list) {
        if (!firstSeenAt.current.has(o.id)) firstSeenAt.current.set(o.id, ts);
      }

      /* Gerar eventos de actividade */
      const prevMap = new Map(prevOrdersRef.current.map(o => [o.id, o]));
      const newEvts = [];

      if (isFirstLoad.current) {
        /* Primeiro carregamento — snapshot do estado actual (mais recentes primeiro) */
        const active = list
          .filter(o => o.order_status && o.order_status !== "Cancelled")
          .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
          .slice(0, 20);
        for (const o of active) {
          const evtType = KDS_STATUS_TO_EVENT[o.order_status];
          if (evtType) newEvts.push(makeKdsEvent(evtType, o));
        }
        isFirstLoad.current = false;
      } else {
        /* Refreshes seguintes — só mudanças */
        for (const o of list) {
          const prev = prevMap.get(o.id);
          if (!prev) {
            newEvts.push(makeKdsEvent("new_order", o));
          } else if (prev.order_status !== o.order_status) {
            const evtType = KDS_STATUS_TO_EVENT[o.order_status];
            if (evtType) newEvts.push(makeKdsEvent(evtType, o));
          }
        }
      }

      prevOrdersRef.current = list;
      if (newEvts.length > 0) {
        setActivityLog(prev => [...newEvts, ...prev].slice(0, 100));
      }

      setOrders(list);
    } catch (err) {
      console.error(err);
      setError("Não foi possível carregar os pedidos.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  /* Auto-refresh a cada 30 s */
  useEffect(() => {
    const id = setInterval(loadData, 30_000);
    return () => clearInterval(id);
  }, [loadData]);


  const ordersWithDetails = useMemo(() =>
    orders
      .filter(o => o.order_status && o.order_status !== "Cancelled")
      .map(o => {
        const kitchenItems = Array.isArray(o.kitchen_sequence_json)
          ? o.kitchen_sequence_json
          : (() => { try { return JSON.parse(o.kitchen_sequence_json); } catch { return []; } })();
        return { ...o, kitchenItems, displayStatus: mapDisplayStatus(o.order_status) };
      }),
    [orders],
  );

  const groupedOrders = useMemo(() =>
    KDS_STATUS_COLUMNS.reduce((acc, col) => {
      acc[col.status] = ordersWithDetails.filter(o => o.displayStatus === col.status);
      return acc;
    }, {}),
    [ordersWithDetails],
  );

  /* ── Auto-avanço e auto-remoção quando o timer esgota ── */
  useEffect(() => {
    const toAdvance = [];  // avançar para próximo status
    const toRemove  = [];  // remover do kanban (Delivered após 30s)

    orders.forEach(o => {
      const tTarget = KDS_STATUS_TARGET_S[o.order_status];
      if (!tTarget || autoAdvancingRef.current.has(o.id)) return;
      const elapsed = Math.floor((now - (firstSeenAt.current.get(o.id) ?? now)) / 1000);
      if (elapsed < tTarget) return;

      if (o.order_status === "Delivered") {
        toRemove.push(o);
      } else if (KDS_NEXT_STATUS[o.order_status]) {
        toAdvance.push({ ...o, nextStatus: KDS_NEXT_STATUS[o.order_status] });
      }
    });

    if (toAdvance.length === 0 && toRemove.length === 0) return;

    // Marca todos para evitar re-trigger
    [...toAdvance, ...toRemove].forEach(o => autoAdvancingRef.current.add(o.id));

    const ts = Date.now();

    /* ── Avanços de status ── */
    if (toAdvance.length > 0) {
      toAdvance.forEach(o => statusOverridesRef.current.set(o.id, o.nextStatus));

      setOrders(prev => prev.map(o => {
        const adv = toAdvance.find(a => a.id === o.id);
        return adv ? { ...o, order_status: adv.nextStatus, updated_at: new Date(ts).toISOString() } : o;
      }));
      toAdvance.forEach(o => firstSeenAt.current.set(o.id, ts));
      toAdvance.forEach(order => {
        const evtType = KDS_STATUS_TO_EVENT[order.nextStatus];
        if (evtType) setActivityLog(prev => [makeKdsEvent(evtType, order), ...prev].slice(0, 100));
      });

      // Notifica outras páginas (TablePage) que pedidos mudaram de status
      window.dispatchEvent(new CustomEvent('orders:statusChanged'));

      toAdvance.forEach(order => {
        orderService.updateStatus(order.id, order.nextStatus)
          .catch(err => console.error("auto-advance:", order.id, "→", order.nextStatus, err))
          .finally(() => autoAdvancingRef.current.delete(order.id));
      });
    }

    /* ── Remoções do kanban (Delivered → oculto, não apagado da DB) ── */
    if (toRemove.length > 0) {
      toRemove.forEach(o => {
        hiddenFromKanban.current.add(o.id);
        statusOverridesRef.current.delete(o.id);
        autoAdvancingRef.current.delete(o.id);
      });
      setOrders(prev => prev.filter(o => !hiddenFromKanban.current.has(o.id)));
    }
  }, [now, orders]); // firstSeenAt é ref de módulo, não precisa de dep

  return (
    <PageSection>

      {/* ── Linha 1: Título (esq) + Ecrã de Actividade (dir) ── */}
      <div className="flex flex-col md:flex-row items-start gap-4">

        {/* Card título */}
        <div className="rounded-[32px] bg-surface px-6 py-4 shadow-sm flex items-center justify-between w-full md:flex-1">
          <div>
            <h1 className="text-xl font-semibold">KDS — Cozinha</h1>
            <p className="mt-0.5 text-sm" style={{ color: "var(--text-secondary)" }}>
              Pedidos em produção · auto-refresh 30 s · <span style={{ color: "var(--primary)" }}>🤖 Bot Chef IA</span>
            </p>
          </div>
          <button
            onClick={loadData}
            title="Atualizar agora"
            className="w-9 h-9 inline-flex items-center justify-center rounded-xl border border-[var(--border)] transition-colors"
            style={{ color: "var(--text-secondary)", background: "var(--surface-2)" }}
          >
            <i className={`fa-solid fa-rotate-right text-sm${loading ? " fa-spin" : ""}`} />
          </button>
        </div>

        {/* Card actividade */}
        <div className="rounded-[32px] bg-surface p-2 shadow-sm w-full md:w-[280px] md:flex-shrink-0">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-sm font-semibold" style={{ color: "var(--text)" }}>Ecrã de Actividade</h2>
            {activityLog.length > 0 && (
              <button
                onClick={() => setActivityLog([])}
                style={{ fontSize: 11, color: "var(--text-muted)", background: "none", border: "none", cursor: "pointer" }}
              >
                Limpar
              </button>
            )}
          </div>
          <ActivityScreen events={activityLog} />
        </div>

      </div>

      {/* ── Card 2: Kanban ── */}
      <div className="rounded-[32px] bg-surface shadow-sm" style={{ overflow: "hidden" }}>
        {loading && orders.length === 0 ? (
          <div className="rounded-3xl p-8 text-center text-sm" style={{ background: "var(--surface-2)", color: "var(--text-secondary)" }}>
            <i className="fa-solid fa-spinner fa-spin mr-2" />A carregar pedidos…
          </div>
        ) : error ? (
          <div className="rounded-3xl p-8 text-center text-sm" style={{ background: "#fef2f2", color: "#991b1b" }}>
            {error}
            <button onClick={loadData} className="ml-3 underline font-semibold">Tentar novamente</button>
          </div>
        ) : (
          <div className="flex flex-col md:flex-row md:overflow-x-auto gap-3 p-4"
               style={{ scrollbarWidth: "thin", scrollbarColor: "var(--border) transparent" }}>
            {KDS_STATUS_COLUMNS.map(col => {
              const colOrders  = groupedOrders[col.status] || [];
              const colBg      = isDark ? col.bgDark : col.bg;
              const labelColor = isDark ? "var(--text)" : "#374151";
              const emptyColor = isDark ? "rgba(255,255,255,0.18)" : "rgba(0,0,0,0.18)";
              return (
                <div key={col.status} className="w-full md:w-[260px] md:flex-shrink-0" style={{ borderRadius: 12, overflow: "hidden", border: isDark ? "1px solid rgba(255,255,255,0.06)" : "1px solid rgba(0,0,0,0.06)", boxShadow: "0 1px 3px rgba(0,0,0,0.05)" }}>
                  <div style={{ backgroundColor: colBg, padding: "10px 12px", display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: isDark ? "1px solid rgba(255,255,255,0.06)" : "1px solid rgba(0,0,0,0.06)" }}>
                    <div>
                      <span style={{ fontSize: 12, fontWeight: 700, letterSpacing: "0.05em", color: labelColor }}>
                        {KDS_STATUS_ICON[col.status]} {col.title}
                      </span>
                      {col.subtitle && (
                        <p style={{ fontSize: 9, color: col.cardBorder, margin: "2px 0 0", fontWeight: 600, letterSpacing: "0.04em" }}>
                          {col.subtitle}
                        </p>
                      )}
                    </div>
                    <span style={{ backgroundColor: col.cardBorder, color: "#fff", borderRadius: "50%", width: 22, height: 22, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700, flexShrink: 0 }}>
                      {colOrders.length}
                    </span>
                  </div>
                  <div style={{ backgroundColor: colBg, padding: 8, minHeight: 160, display: "flex", flexDirection: "column", gap: 8 }}>
                    {colOrders.map(order => (
                      <OrderCard key={order.id} order={order} cardBorder={col.cardBorder} now={now} firstSeenAt={firstSeenAt.current} />
                    ))}
                    {colOrders.length === 0 && <p style={{ textAlign: "center", color: emptyColor, fontSize: 12, paddingTop: 20 }}>—</p>}
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
