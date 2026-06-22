import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router";
import { useAuth } from "@/context/AuthContext";
import { orderService } from "@/services/orderService";
import { orderItemService } from "@/services/orderItemService";
import { invoiceService } from "@/services/invoiceService";
import { paymentService } from "@/services/paymentService";
import { itemService } from "@/services/itemService";
import { getOrderTarget, getOrderItemCount, ORDER_TABS, filterOrders, ORDER_STATUS_META, ORDER_PAGE_SIZE } from "@/utils/orderUtils";
import { TrophySpin, OrderStatusModal, PaymentModal } from "@/components/ui";
import { Pagination } from "@/components/ui/shared/Pagination";

const PAGE_SIZE = ORDER_PAGE_SIZE;

// Página que mostra a lista de pedidos do cliente.
export default function CustomerOrdersPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [orders, setOrders] = useState([]);
  const [invoiceMap, setInvoiceMap] = useState({});
  const [paidOrderIds, setPaidOrderIds] = useState(new Set());
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("all");
  const [page, setPage] = useState(1);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);
  const [payInfo, setPayInfo] = useState(null);
  const [repeatAllergyOrder, setRepeatAllergyOrder] = useState(null);
  const [allergyText, setAllergyText] = useState("");
  const [repeatPayInfo, setRepeatPayInfo] = useState(null);
  const [repeatPayLoading, setRepeatPayLoading] = useState(false);
  const [repeatPayError, setRepeatPayError] = useState("");
  const repeatPayingRef = useRef(false);

  const load = useCallback(async () => {
    if (!user?.id) return;
    try {
      const list = await orderService.getByUser(user.id);
      const rows = Array.isArray(list) ? list : [];
      setOrders(rows);

      const pairs = await Promise.all(
        rows.map((order) =>
          invoiceService.getByOrder(order.id)
            .then((inv) => [order.id, inv])
            .catch(() => [order.id, null])
        )
      );
      const map = Object.fromEntries(pairs);
      setInvoiceMap(map);

      // Ordena os não-Pending como "pago" directamente (novo fluxo: pedido criado = pago)
      const paidIds = new Set(
        rows.filter(o => o.order_status !== "Pending").map(o => o.id)
      );
      // Para pedidos Pending com fatura, confirma se pagamento existe
      await Promise.all(
        Object.entries(map)
          .filter(([orderId, inv]) => inv?.id && !paidIds.has(Number(orderId)))
          .map(async ([orderId, inv]) => {
            const payment = await paymentService.getByInvoice(inv.id).catch(() => null);
            const isCompleted = payment && (
              Array.isArray(payment)
                ? payment.some(p => p.payment_status === "Completed")
                : payment.payment_status === "Completed"
            );
            if (isCompleted) paidIds.add(Number(orderId));
          })
      );
      setPaidOrderIds(prev => {
        const merged = new Set(prev);
        paidIds.forEach(id => merged.add(id));
        return merged;
      });
    } catch { /* silent */ }
    finally { setLoading(false); }
  }, [user?.id]);

  useEffect(() => {
    load();
    const id = setInterval(load, 30_000);
    return () => clearInterval(id);
  }, [load]);

  const statusCounts = useMemo(() => {
    const counts = { all: orders.length };
    ORDER_TABS.forEach(t => { if (t.key !== 'all') counts[t.key] = orders.filter(o => o.order_status === t.key).length; });
    return counts;
  }, [orders]);

  const filteredOrders = useMemo(() => filterOrders(orders, { tab }), [orders, tab]);
  const paginatedOrders = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return filteredOrders.slice(start, start + PAGE_SIZE);
  }, [filteredOrders, page]);

  const handleTabChange = (key) => { setTab(key); setPage(1); };
  const handleViewState = (order) => setSelectedOrder(order);

  const handleDelete = async (orderId) => {
    try {
      await orderService.remove(orderId);
      setOrders(prev => prev.filter(o => o.id !== orderId));
    } catch { /* silent */ }
    finally { setConfirmDeleteId(null); }
  };

  // Passo 1: recolher alergias e calcular total → abre modal de pagamento.
  // Usa kitchen_sequence_json como fonte de verdade — sem API calls para não bloquear os botões.
  const handleRepeatAllergyConfirm = (allergies) => {
    if (!repeatAllergyOrder) return;
    try {
      const rawSeq = typeof repeatAllergyOrder.kitchen_sequence_json === 'string'
        ? JSON.parse(repeatAllergyOrder.kitchen_sequence_json)
        : (repeatAllergyOrder.kitchen_sequence_json ?? []);

      const kitchenSeq = (Array.isArray(rawSeq) ? rawSeq : [])
        .map(item => ({
          name: item.name,
          quantity: Number(item.quantity),
          price: Number(item.price),
        }))
        .filter(i => i.name && i.price > 0 && i.quantity > 0);

      if (!kitchenSeq.length) return;

      // Preços em kitchen_sequence_json são base (sem IVA) — o total real inclui 13% IVA
      const rawSubtotal = kitchenSeq.reduce((s, i) => s + i.price * i.quantity, 0);
      const total = Math.round(rawSubtotal * 1.13 * 100) / 100;
      setRepeatPayInfo({
        originalOrder: repeatAllergyOrder,
        allergies,
        kitchenSeq,
        originalItems: [],
        total,
      });
      setRepeatAllergyOrder(null);
      setAllergyText("");
      setRepeatPayError("");
    } catch { /* silent */ }
  };

  // Passo 2: criar pedido + fatura + pagamento atomicamente
  const handleRepeatPay = async () => {
    if (!repeatPayInfo || repeatPayingRef.current) return;
    repeatPayingRef.current = true;
    setRepeatPayLoading(true);
    setRepeatPayError("");
    try {
      const order = await orderService.create({
        user_id: user.id,
        service_type: repeatPayInfo.originalOrder.service_type ?? "Takeaway",
        allergy_restrictions: repeatPayInfo.allergies || null,
        kitchen_sequence_json: JSON.stringify(repeatPayInfo.kitchenSeq.map(i => ({ name: i.name, quantity: i.quantity, price: i.price }))),
        order_status: "Pending",
      });
      if (!order?.id) throw new Error("Não foi possível criar o pedido.");

      // Verificar se o backend cancelou o pedido por falta de stock
      const freshOrder = await orderService.getById(order.id).catch(() => order);
      if (freshOrder?.order_status === 'Cancelled') {
        throw new Error("stock_cancelled");
      }

      if (repeatPayInfo.originalItems.length) {
        await orderItemService.createBulk({
          order_id: order.id,
          items: repeatPayInfo.originalItems.map(i => ({ item_id: i.item_id, quantity: i.quantity })),
        }).catch(() => {});
      }

      const total    = Number(repeatPayInfo.total.toFixed(2));
      const subtotal = Number((total / 1.13).toFixed(2));
      const tax      = Number((total - subtotal).toFixed(2));

      // Backend auto-cria fatura para Takeaway — tentar GET antes de criar (evita 409)
      let inv = await invoiceService.getByOrder(order.id).catch(() => null);
      if (!inv?.id) {
        try {
          inv = await invoiceService.create({ order_id: order.id, subtotal_amount: subtotal, tax_amount: tax, total_amount: total, profit_margin: 0 });
        } catch (err) {
          if (!err?.message?.includes("409")) throw err;
          inv = await invoiceService.getByOrder(order.id);
        }
      }
      if (!inv?.id) throw new Error("Não foi possível obter a fatura.");

      // Usar o total da fatura (valor real com IVA) para o pagamento — garante pontos correctos
      const payAmount = Number(inv.total_amount);

      try {
        await paymentService.create({ invoice_id: inv.id, user_id: user.id, amount: payAmount, payment_method: "Cash", payment_status: "Completed" });
      } catch (err) {
        if (!err?.message?.includes("409")) throw err;
      }

      orderService.chefStart(order.id).catch(() => {});
      setRepeatPayInfo(null);
      load();
    } catch (err) {
      if (err?.message === 'stock_cancelled') {
        setRepeatPayError("Um ou mais artigos estão indisponíveis. Pedido cancelado — verifica as notificações.");
      } else {
        setRepeatPayError("Erro ao processar pagamento. Tente novamente.");
      }
    } finally {
      repeatPayingRef.current = false;
      setRepeatPayLoading(false);
    }
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
        <div>
          <h2 className="text-2xl font-bold" style={{ color: "var(--text)" }}>Meus Pedidos</h2>
        </div>

        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
          {ORDER_TABS.map((tabItem) => {
            const active = tab === tabItem.key;
            const count = statusCounts[tabItem.key] ?? 0;
            return (
              <button
                key={tabItem.key}
                onClick={() => handleTabChange(tabItem.key)}
                className="flex-shrink-0 relative transition-colors"
                style={{
                  background: active ? "var(--primary)" : "var(--surface)",
                  color: active ? "#fff" : "var(--text-secondary)",
                  border: active ? "none" : "1px solid var(--border)",
                  borderRadius: "9999px",
                }}
              >
                {/* Desktop: ícone + label + badge */}
                <span className="hidden sm:flex items-center gap-1.5 px-4 py-1.5 text-xs font-semibold">
                  <i className={`${tabItem.icon} text-[10px]`} />
                  {tabItem.label}
                  {count > 0 && (
                    <span className="ml-0.5 px-1.5 py-0.5 rounded-full text-[9px] font-bold leading-none"
                      style={{ background: active ? "rgba(255,255,255,0.25)" : "var(--primary)", color: active ? "#fff" : "#fff" }}>
                      {count}
                    </span>
                  )}
                </span>
                {/* Mobile: só ícone com badge em cima */}
                <span className="sm:hidden flex flex-col items-center justify-center w-10 h-10 text-xs font-semibold relative">
                  <i className={`${tabItem.icon} text-sm`} />
                  {count > 0 && (
                    <span className="absolute -top-1 -right-1 w-4 h-4 flex items-center justify-center rounded-full text-white font-bold"
                      style={{ background: active ? "rgba(255,255,255,0.3)" : "var(--primary)", fontSize: "8px", border: "1px solid var(--bg)" }}>
                      {count > 9 ? "9+" : count}
                    </span>
                  )}
                </span>
              </button>
            );
          })}
        </div>

        {/* Mobile cards */}
        <div className="md:hidden space-y-3">
          {paginatedOrders.length === 0 ? (
            <p className="text-sm text-center py-8" style={{ color: "var(--text-muted)" }}>Não existem pedidos para este filtro.</p>
          ) : paginatedOrders.map((order) => {
            const meta = ORDER_STATUS_META[order.order_status];
            const inv = invoiceMap[order.id];
            const total = inv?.total_amount;
            const isTable = !!order.table_id;
            const isPaid = paidOrderIds.has(order.id);
            return (
              <div key={order.id} className="rounded-2xl p-4 space-y-3" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-bold" style={{ color: "var(--primary)" }}>#{order.id} · {getOrderTarget(order)}</span>
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full" style={{ background: meta?.bg, color: meta?.text }}>{meta?.label || order.order_status}</span>
                </div>
                <div className="flex items-center justify-between text-xs" style={{ color: "var(--text-muted)" }}>
                  <span>{getOrderItemCount(order)} itens</span>
                  <span className="font-semibold" style={{ color: "var(--text)" }}>{total ? `€${Number(total).toFixed(2)}` : "—"}</span>
                  <span>{new Date(order.created_at).toLocaleString("pt-PT", { day:"2-digit", month:"2-digit", hour:"2-digit", minute:"2-digit" })}</span>
                </div>
                <div className="flex items-center gap-2 pt-1">
                  <button onClick={() => handleViewState(order)} className="w-8 h-8 flex items-center justify-center rounded-xl border border-[var(--border)] bg-[var(--bg)]" style={{ color: "var(--text)" }}><i className="fa-solid fa-eye text-xs" /></button>
                  <button onClick={() => { setRepeatAllergyOrder(order); setAllergyText(""); }} className="w-8 h-8 flex items-center justify-center rounded-xl border border-[var(--border)] bg-[var(--bg)]" style={{ color: "var(--text)" }}><i className="fa-solid fa-repeat text-xs" /></button>
                  <button onClick={() => setConfirmDeleteId(order.id)} className="w-8 h-8 flex items-center justify-center rounded-xl border border-[var(--border)] bg-[var(--bg)]" style={{ color: "var(--text)" }}><i className="fa-solid fa-trash text-xs" /></button>
                  {inv?.id && (
                    isPaid || !isTable ? (
                      <span className="px-2.5 py-1 rounded-full text-[10px] font-semibold" style={{ background: "rgba(34,197,94,0.12)", color: "#22c55e" }}>Pago</span>
                    ) : (
                      <button onClick={() => setPayInfo({ order, inv })} className="px-3 py-1.5 rounded-lg text-xs font-bold text-white" style={{ background: "#22c55e" }}>Pagar</button>
                    )
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Desktop table */}
        <div className="hidden md:block overflow-x-auto rounded-2xl bg-[var(--surface)] border border-[var(--border)]">
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
              {paginatedOrders.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-sm" style={{ color: "var(--text-muted)" }}>
                    Não existem pedidos para este filtro.
                  </td>
                </tr>
              ) : paginatedOrders.map((order) => {
                const inv = invoiceMap[order.id];
                const isTable = !!order.table_id;
                const isPaid = paidOrderIds.has(order.id);
                return (
                  <tr key={order.id} className="border-b last:border-b-0 hover:bg-[var(--surface-2)]" style={{ borderColor: "var(--border)" }}>
                    <td className="px-4 py-4 font-semibold" style={{ color: "var(--primary)" }}>#{order.id}</td>
                    <td className="px-4 py-4" style={{ color: "var(--text)" }}>{getOrderTarget(order)}</td>
                    <td className="px-4 py-4"><span className="rounded-full px-3 py-1 text-[11px] font-semibold" style={{ background: ORDER_STATUS_META[order.order_status]?.bg, color: ORDER_STATUS_META[order.order_status]?.text }}>{ORDER_STATUS_META[order.order_status]?.label || order.order_status}</span></td>
                    <td className="px-4 py-4" style={{ color: "var(--text)" }}>{getOrderItemCount(order)}</td>
                    <td className="px-4 py-4 font-semibold" style={{ color: "var(--text)" }}>{inv?.total_amount ? `€${Number(inv.total_amount).toFixed(2)}` : "—"}</td>
                    <td className="px-4 py-4" style={{ color: "var(--text-muted)" }}>{new Date(order.created_at).toLocaleString("pt-PT", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" })}</td>
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-2">
                        <button type="button" onClick={() => handleViewState(order)} title="Ver estado"
                          className="w-8 h-8 flex items-center justify-center rounded-xl transition hover:text-[var(--primary)]"
                          style={{ color: "var(--text-muted)" }}>
                          <i className="fa-solid fa-eye text-sm" />
                        </button>
                        <button type="button" onClick={() => { setRepeatAllergyOrder(order); setAllergyText(""); }} title="Repetir pedido"
                          className="w-8 h-8 flex items-center justify-center rounded-xl transition hover:text-[var(--primary)]"
                          style={{ color: "var(--text-muted)" }}>
                          <i className="fa-solid fa-repeat text-sm" />
                        </button>
                        <button type="button" onClick={() => setConfirmDeleteId(order.id)} title="Remover pedido"
                          className="w-8 h-8 flex items-center justify-center rounded-xl transition hover:text-red-400"
                          style={{ color: "var(--text-muted)" }}>
                          <i className="fa-solid fa-trash text-sm" />
                        </button>
                        {inv?.id && (
                          isPaid || !isTable ? (
                            <span className="px-2.5 py-1 rounded-full text-[10px] font-semibold whitespace-nowrap" style={{ background: "rgba(34,197,94,0.12)", color: "#22c55e" }}>Pago</span>
                          ) : (
                            <button type="button" onClick={() => setPayInfo({ order, inv })}
                              className="px-3 py-1.5 rounded-lg text-xs font-bold text-white whitespace-nowrap"
                              style={{ background: "#22c55e" }}>
                              Pagar
                            </button>
                          )
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {filteredOrders.length > PAGE_SIZE && (
          <div className="flex justify-center pt-2">
            <Pagination page={page} total={filteredOrders.length} pageSize={PAGE_SIZE} onChange={setPage} />
          </div>
        )}
      </div>
      {selectedOrder && (
        <OrderStatusModal order={selectedOrder} onClose={() => setSelectedOrder(null)} />
      )}

      {confirmDeleteId !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)" }}>
          <div className="w-full max-w-sm rounded-2xl p-6 shadow-2xl" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
            <div className="flex items-center gap-3 mb-3">
              <i className="fa-solid fa-trash text-lg" style={{ color: "#ef4444" }} />
              <h3 className="text-base font-bold" style={{ color: "var(--text)" }}>Remover pedido #{confirmDeleteId}</h3>
            </div>
            <p className="text-sm mb-6" style={{ color: "var(--text-muted)" }}>
              Tens a certeza que queres remover este pedido? Esta acção não pode ser desfeita.
            </p>
            <div className="flex gap-2">
              <button onClick={() => setConfirmDeleteId(null)}
                className="flex-1 py-2.5 rounded-xl text-sm font-semibold"
                style={{ background: "var(--surface-2)", color: "var(--text-secondary)", border: "1px solid var(--border)" }}>
                Cancelar
              </button>
              <button onClick={() => handleDelete(confirmDeleteId)}
                className="flex-1 py-2.5 rounded-xl text-sm font-bold text-white"
                style={{ background: "#ef4444" }}>
                Remover
              </button>
            </div>
          </div>
        </div>
      )}

      {payInfo && (
        <PaymentModal
          onClose={() => setPayInfo(null)}
          unpaidInvoices={[{ orderId: payInfo.order.id, inv: payInfo.inv }]}
          userId={user?.id}
          onPaid={() => {
            const paidId = payInfo.order.id;
            setPaidOrderIds(prev => { const s = new Set(prev); s.add(paidId); return s; });
            setPayInfo(null);
            setTimeout(() => load(), 800);
          }}
        />
      )}

      {repeatAllergyOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)" }}
          onClick={(e) => { if (e.target === e.currentTarget && !repeatPayLoading) setRepeatAllergyOrder(null); }}>
          <div className="w-full max-w-sm rounded-2xl p-6 shadow-2xl" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
            <div className="flex items-center gap-3 mb-4">
              <i className="fa-solid fa-repeat text-lg" style={{ color: "var(--primary)" }} />
              <h3 className="text-base font-bold" style={{ color: "var(--text)" }}>Repetir pedido #{repeatAllergyOrder.id}</h3>
            </div>
            <p className="text-sm mb-4" style={{ color: "var(--text-muted)" }}>
              Tens alguma alergia ou intolerância alimentar que devemos ter em conta?
            </p>
            <textarea
              value={allergyText}
              onChange={(e) => setAllergyText(e.target.value)}
              placeholder="Ex: gluten, lactose... (opcional)"
              rows={3}
              className="w-full rounded-xl px-3 py-2 text-sm outline-none resize-none mb-4"
              style={{ background: "var(--surface-2)", border: "1.5px solid var(--border)", color: "var(--text)" }}
            />
            <div className="flex gap-2">
              <button onClick={() => handleRepeatAllergyConfirm(null)}
                className="flex-1 py-2.5 rounded-xl text-sm font-semibold"
                style={{ background: "var(--surface-2)", color: "var(--text-secondary)", border: "1px solid var(--border)" }}>
                Sem alergias
              </button>
              <button onClick={() => handleRepeatAllergyConfirm(allergyText.trim() || null)}
                className="flex-1 py-2.5 rounded-xl text-sm font-bold text-white"
                style={{ background: "var(--primary)" }}>
                Continuar
              </button>
            </div>
          </div>
        </div>
      )}

      {repeatPayInfo && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)" }}
          onClick={(e) => { if (e.target === e.currentTarget && !repeatPayLoading) setRepeatPayInfo(null); }}>
          <div className="w-full max-w-sm rounded-2xl shadow-2xl overflow-hidden" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
            <div className="flex items-center justify-between px-5 py-4 border-b" style={{ borderColor: "var(--border)" }}>
              <h3 className="text-base font-bold" style={{ color: "var(--text)" }}>
                <i className="fa-solid fa-credit-card mr-2" style={{ color: "var(--primary)" }} />
                Pagamento
              </h3>
              <button onClick={() => setRepeatPayInfo(null)} disabled={repeatPayLoading} className="p-1.5 rounded-lg" style={{ color: "var(--text-muted)" }}>
                <i className="fa-solid fa-xmark" />
              </button>
            </div>

            <div className="px-5 py-4 space-y-3">
              <div className="rounded-xl overflow-hidden" style={{ border: "1px solid var(--border)" }}>
                {repeatPayInfo.kitchenSeq.map((item, i) => (
                  <div key={i} className="flex items-center justify-between px-4 py-2.5"
                    style={{ borderBottom: i < repeatPayInfo.kitchenSeq.length - 1 ? "1px solid var(--border)" : "none", background: "var(--surface-2)" }}>
                    <span className="text-xs" style={{ color: "var(--text-muted)" }}>{item.name} × {item.quantity}</span>
                    <span className="text-xs font-semibold" style={{ color: "var(--text)" }}>€{(item.price * item.quantity).toFixed(2)}</span>
                  </div>
                ))}
              </div>
              <div className="flex items-center justify-between px-4 py-3 rounded-xl"
                style={{ background: "var(--surface-2)", border: "1px solid var(--border)" }}>
                <span className="text-sm font-semibold" style={{ color: "var(--text-muted)" }}>Total</span>
                <span className="text-xl font-bold" style={{ color: "var(--primary)" }}>€{Number(repeatPayInfo.total).toFixed(2)}</span>
              </div>
              {repeatPayError && (
                <p className="text-xs px-3 py-2 rounded-lg" style={{ background: "rgba(239,68,68,0.1)", color: "#ef4444" }}>
                  {repeatPayError}
                </p>
              )}
            </div>

            <div className="px-5 pb-5 flex gap-2">
              <button onClick={() => setRepeatPayInfo(null)} disabled={repeatPayLoading}
                className="flex-1 py-2.5 rounded-xl text-sm font-semibold"
                style={{ background: "var(--surface-2)", color: "var(--text-secondary)", border: "1px solid var(--border)" }}>
                Cancelar
              </button>
              <button onClick={handleRepeatPay} disabled={repeatPayLoading}
                className="flex-1 py-2.5 rounded-xl text-sm font-bold text-white disabled:opacity-60"
                style={{ background: "var(--primary)" }}>
                {repeatPayLoading ? "A processar..." : `Pagar €${Number(repeatPayInfo.total).toFixed(2)}`}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
