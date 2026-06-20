import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { PageSection, Pagination, StatCard } from "@/components";
import {
  invoiceService, orderService, paymentService,
  orderItemService, itemService,
} from "@/services";
import {
  getOrderClientName, fmtEur,
  FATURACAO_PAGE_SIZE, PAYMENT_STATUS_META,
  fmtInvoiceNumber, exportInvoicesCSV,
} from "@/utils";
import { useTheme } from "@/context/ThemeContext";

// ── helpers ───────────────────────────────────────────────────────────────────

const TODAY = new Date().toISOString().slice(0, 10);
const THIRTY_DAYS_AGO = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

function PayBadge({ status }) {
  const m = PAYMENT_STATUS_META[status] ?? PAYMENT_STATUS_META.none;
  return (
    <span style={{
      display: "inline-block",
      backgroundColor: m.bg,
      color: m.text,
      border: `1px solid ${m.color}40`,
      borderRadius: 999,
      padding: "2px 10px",
      fontSize: 12,
      fontWeight: 600,
      whiteSpace: "nowrap",
    }}>
      {m.label}
    </span>
  );
}

// ── NovaFaturaModal ───────────────────────────────────────────────────────────

function NovaFaturaModal({ orders, invoices, orderItems, menuItems, onClose, onCreate }) {
  const [orderId, setOrderId] = useState("");
  const [ivaRate, setIvaRate] = useState(13);
  const [saving, setSaving]   = useState(false);
  const [err, setErr]         = useState("");

  const invoiceOrderIds = useMemo(() => new Set(invoices.map(i => i.order_id)), [invoices]);
  const availableOrders = useMemo(() => orders.filter(o => !invoiceOrderIds.has(o.id)), [orders, invoiceOrderIds]);

  const itemPriceMap = useMemo(() => {
    const m = new Map();
    menuItems.forEach(i => m.set(i.id, Number(i.price)));
    return m;
  }, [menuItems]);

  const subtotal = useMemo(() => {
    if (!orderId) return 0;
    const oid = parseInt(orderId);
    return orderItems
      .filter(oi => oi.order_id === oid)
      .reduce((s, oi) => s + oi.quantity * (itemPriceMap.get(oi.item_id) || 0), 0);
  }, [orderId, orderItems, itemPriceMap]);

  const tax   = subtotal * (ivaRate / 100);
  const total = subtotal + tax;

  const fmt = (v) => `${v.toFixed(2)} €`;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!orderId) return setErr("Selecione um pedido.");
    setSaving(true); setErr("");
    try {
      const created = await invoiceService.create({
        order_id:        parseInt(orderId),
        subtotal_amount: parseFloat(subtotal.toFixed(2)),
        tax_amount:      parseFloat(tax.toFixed(2)),
        total_amount:    parseFloat(total.toFixed(2)),
        profit_margin:   0,
      });
      onCreate(created);
      onClose();
    } catch { setErr("Erro ao criar fatura. O pedido pode já ter fatura associada."); }
    finally { setSaving(false); }
  };

  const inputStyle = { background: "var(--surface-2)", border: "1px solid var(--border)", color: "var(--text)" };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.5)" }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="rounded-[24px] p-6 w-full max-w-md shadow-2xl"
        style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-bold" style={{ color: "var(--text)" }}>Nova Fatura</h2>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-xl"
            style={{ background: "var(--surface-2)", color: "var(--text-muted)" }}>
            <i className="fa-solid fa-xmark text-sm" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <label className="block text-xs font-semibold mb-1" style={{ color: "var(--text-secondary)" }}>Pedido *</label>
            <select value={orderId} onChange={e => setOrderId(e.target.value)}
              className="w-full rounded-xl px-3 py-2 text-sm outline-none"
              style={inputStyle}>
              <option value="">Selecione um pedido…</option>
              {availableOrders.map(o => (
                <option key={o.id} value={o.id}>
                  #{o.id} — {o.user_name || "Sem cliente"} ({o.table_id ? `Mesa ${o.table_id}` : "Takeaway"})
                </option>
              ))}
            </select>
            {availableOrders.length === 0 && (
              <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>Todos os pedidos já têm fatura.</p>
            )}
          </div>
          <div>
            <label className="block text-xs font-semibold mb-1" style={{ color: "var(--text-secondary)" }}>Taxa de IVA</label>
            <select value={ivaRate} onChange={e => setIvaRate(Number(e.target.value))}
              className="w-full rounded-xl px-3 py-2 text-sm outline-none"
              style={inputStyle}>
              <option value={6}>6%</option>
              <option value={13}>13%</option>
              <option value={23}>23%</option>
            </select>
          </div>
          {orderId && (
            <div className="rounded-xl p-3 space-y-1.5" style={{ background: "var(--surface-2)" }}>
              <div className="flex justify-between text-xs" style={{ color: "var(--text-secondary)" }}>
                <span>Subtotal</span><span>{fmt(subtotal)}</span>
              </div>
              <div className="flex justify-between text-xs" style={{ color: "var(--text-secondary)" }}>
                <span>IVA ({ivaRate}%)</span><span>{fmt(tax)}</span>
              </div>
              <div className="flex justify-between text-sm font-bold pt-1" style={{ borderTop: "1px solid var(--border)", color: "var(--text)" }}>
                <span>Total</span><span>{fmt(total)}</span>
              </div>
            </div>
          )}
          {err && <p className="text-xs text-red-500">{err}</p>}
          <div className="flex gap-2 pt-1">
            <button type="button" onClick={onClose}
              className="flex-1 py-2 rounded-xl text-sm font-semibold"
              style={{ background: "var(--surface-2)", color: "var(--text-secondary)" }}>
              Cancelar
            </button>
            <button type="submit" disabled={saving || !orderId}
              className="flex-1 py-2 rounded-xl text-sm font-semibold text-white disabled:opacity-60"
              style={{ background: "var(--primary)" }}>
              {saving ? <i className="fa-solid fa-spinner fa-spin" /> : "Criar Fatura"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── main component ────────────────────────────────────────────────────────────

export default function FaturacaoPage() {
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const queryClient = useQueryClient();

  const [dateFrom, setDateFrom]     = useState(THIRTY_DAYS_AGO);
  const [dateTo, setDateTo]         = useState(TODAY);
  const [page, setPage]             = useState(1);
  const [selectedInv, setSelectedInv] = useState(null);
  const [showCreate, setShowCreate] = useState(false);

  const { data: invoices   = [] } = useQuery({ queryKey: ["invoices"],    queryFn: invoiceService.getAll,    refetchInterval: 30_000 });
  const { data: orders     = [] } = useQuery({ queryKey: ["orders"],      queryFn: orderService.getAll,      refetchInterval: 30_000 });
  const { data: payments   = [] } = useQuery({ queryKey: ["payments"],    queryFn: paymentService.getAll,    refetchInterval: 30_000 });
  const { data: orderItems = [] } = useQuery({ queryKey: ["order-items"], queryFn: orderItemService.getAll,  refetchInterval: 30_000 });
  const { data: menuItems  = [] } = useQuery({ queryKey: ["items"],       queryFn: itemService.getAll,       refetchInterval: 30_000 });

  // ── enrich: join invoices ↔ orders ↔ payments ───────────────────────────────
  const enrichedInvoices = useMemo(() => {
    const orderMap    = new Map(orders.map(o => [o.id, o]));
    const payByInvoice = new Map(payments.map(p => [p.invoice_id, p]));
    return invoices
      .map(inv => {
        const order   = orderMap.get(inv.order_id) ?? {};
        const payment = payByInvoice.get(inv.id);
        return {
          ...inv,
          order,
          payment,
          customerName:  getOrderClientName(order),
          tableLabel:    order.table_id ? `Mesa ${order.table_id}` : "Takeaway",
          paymentStatus: payment?.payment_status ?? "none",
          paymentMethod: payment?.payment_method ?? "—",
        };
      })
      .sort((a, b) => new Date(b.issued_at) - new Date(a.issued_at));
  }, [invoices, orders, payments]);

  // ── date filter ─────────────────────────────────────────────────────────────
  const filteredInvoices = useMemo(() => {
    const from = new Date(dateFrom);
    const to   = new Date(dateTo + "T23:59:59");
    return enrichedInvoices.filter(inv => {
      const d = new Date(inv.issued_at);
      return d >= from && d <= to;
    });
  }, [enrichedInvoices, dateFrom, dateTo]);

  // ── KPIs ────────────────────────────────────────────────────────────────────
  const paidInvoices = useMemo(
    () => filteredInvoices.filter(inv => inv.paymentStatus === "Completed"),
    [filteredInvoices]
  );

  const kpis = useMemo(() => {
    const count    = filteredInvoices.length;
    const total    = paidInvoices.reduce((s, i) => s + Number(i.total_amount || 0), 0);
    const taxTotal = paidInvoices.reduce((s, i) => s + Number(i.tax_amount || 0), 0);
    const avgTicket = paidInvoices.length > 0 ? total / paidInvoices.length : 0;
    return { count, total, taxTotal, avgTicket };
  }, [filteredInvoices, paidInvoices]);

  // ── pagination ──────────────────────────────────────────────────────────────
  const pagedInvoices = useMemo(() =>
    filteredInvoices.slice((page - 1) * FATURACAO_PAGE_SIZE, page * FATURACAO_PAGE_SIZE),
    [filteredInvoices, page]);

  // ── detail items: order_items ↔ menu items ──────────────────────────────────
  const itemMap = useMemo(() => new Map(menuItems.map(i => [i.id, i])), [menuItems]);

  const detailItems = useMemo(() => {
    if (!selectedInv) return [];
    return orderItems
      .filter(oi => oi.order_id === selectedInv.order_id)
      .map(oi => {
        const item      = itemMap.get(oi.item_id) ?? {};
        const unitPrice = Number(item.price ?? 0);
        return {
          id:        oi.id,
          name:      item.name ?? `Item ${oi.item_id}`,
          quantity:  oi.quantity,
          unitPrice,
          total:     oi.quantity * unitPrice,
        };
      });
  }, [selectedInv, orderItems, itemMap]);

  // ── IVA % para o painel de detalhe ──────────────────────────────────────────
  const ivaLabel = useMemo(() => {
    if (!selectedInv) return "IVA";
    const sub = Number(selectedInv.subtotal_amount);
    const tax = Number(selectedInv.tax_amount);
    if (!sub || !tax) return "IVA";
    return `IVA (${Math.round((tax / sub) * 100)}%)`;
  }, [selectedInv]);

  // ── input style ─────────────────────────────────────────────────────────────
  const inputStyle = {
    background: "var(--surface-2)",
    border: "1px solid var(--border)",
    borderRadius: 8,
    padding: "6px 10px",
    fontSize: 13,
    color: "var(--text)",
    outline: "none",
    colorScheme: isDark ? "dark" : "light",
  };

  // ── render ──────────────────────────────────────────────────────────────────
  return (
    <PageSection title="Faturação" description="Faturas, pagamentos e receitas">

      {showCreate && (
        <NovaFaturaModal
          orders={orders}
          invoices={invoices}
          orderItems={orderItems}
          menuItems={menuItems}
          onClose={() => setShowCreate(false)}
          onCreate={() => queryClient.invalidateQueries({ queryKey: ["invoices"] })}
        />
      )}

      {/* Date filter + Botões */}
      <div className="flex flex-col gap-4 mb-6">
        {/* Linha 1: [date] — [date] */}
        <div className="flex items-center gap-2">
          <input
            type="date"
            value={dateFrom}
            onChange={e => { setDateFrom(e.target.value); setPage(1); }}
            className="flex-1"
            style={inputStyle}
          />
          <span className="text-xs font-medium flex-shrink-0" style={{ color: "var(--text-muted)" }}>-</span>
          <input
            type="date"
            value={dateTo}
            onChange={e => { setDateTo(e.target.value); setPage(1); }}
            className="flex-1"
            style={inputStyle}
          />
        </div>
        {/* Linha 2: Botões */}
        <div className="flex items-center gap-7">
          <button
            onClick={() => setShowCreate(true)}
            className="flex-1 flex items-center justify-center gap-2 font-semibold text-white"
            style={{ background: "var(--primary)", borderRadius: 8, padding: "6px 10px", fontSize: 13 }}
          >
            <i className="fa-solid fa-plus text-xs" />
            Nova Fatura
          </button>
          <button
            onClick={() => exportInvoicesCSV(filteredInvoices)}
            className="flex-1 flex items-center justify-center gap-2 font-semibold hover:bg-[var(--surface-3)]"
            style={{ background: "var(--surface-2)", color: "var(--text)", border: "1px solid var(--border)", borderRadius: 8, padding: "6px 10px", fontSize: 13 }}
          >
            <i className="fa-solid fa-download text-xs" />
            Exportar
          </button>
        </div>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard label="Faturação Total" value={fmtEur(kpis.total)} />
        <StatCard label="Nº Faturas"      value={kpis.count} />
        <StatCard label="Ticket Médio"    value={fmtEur(kpis.avgTicket)} />
        <StatCard label="IVA Total"       value={fmtEur(kpis.taxTotal)} />
      </div>

      {/* Table + Detail */}
      <div className={`grid gap-4 ${selectedInv ? "lg:grid-cols-5" : "lg:grid-cols-1"}`}>

        {/* Invoice table */}
        <div className={`${selectedInv ? "lg:col-span-3" : ""} rounded-[20px] bg-[var(--surface)] p-5 shadow-sm`}>
          <h3 className="font-semibold text-sm mb-4" style={{ color: "var(--text)" }}>Nº Fatura</h3>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr style={{ borderBottom: "1px solid var(--border)" }}>
                  <th className="pb-2 text-left text-xs font-semibold pr-3" style={{ color: "var(--text-muted)" }}>Nº Fatura</th>
                  <th className="pb-2 text-left text-xs font-semibold pr-3 hidden sm:table-cell" style={{ color: "var(--text-muted)" }}>Cliente</th>
                  <th className="pb-2 text-left text-xs font-semibold pr-3 hidden md:table-cell" style={{ color: "var(--text-muted)" }}>Data</th>
                  <th className="pb-2 text-left text-xs font-semibold pr-3" style={{ color: "var(--text-muted)" }}>Valor</th>
                  <th className="pb-2 text-left text-xs font-semibold" style={{ color: "var(--text-muted)" }}>Estado</th>
                </tr>
              </thead>
              <tbody>
                {pagedInvoices.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-xs" style={{ color: "var(--text-muted)" }}>
                      Sem faturas no período seleccionado
                    </td>
                  </tr>
                ) : (
                  pagedInvoices.map(inv => {
                    const active = selectedInv?.id === inv.id;
                    return (
                      <tr
                        key={inv.id}
                        onClick={() => setSelectedInv(prev => prev?.id === inv.id ? null : inv)}
                        className={`cursor-pointer${!active ? " hover:bg-[var(--surface-2)]" : ""}`}
                        style={{
                          borderBottom: "1px solid var(--border)",
                          background: active
                            ? (isDark ? "rgba(37,99,235,0.12)" : "rgba(37,99,235,0.07)")
                            : "",
                        }}
                      >
                        <td className="py-2.5 pr-3 text-xs font-semibold" style={{ color: "var(--primary)" }}>
                          {fmtInvoiceNumber(inv)}
                        </td>
                        <td className="py-2.5 pr-3 text-xs hidden sm:table-cell" style={{ color: "var(--text)" }}>
                          {inv.customerName}
                        </td>
                        <td className="py-2.5 pr-3 text-xs hidden md:table-cell" style={{ color: "var(--text-muted)" }}>
                          {inv.issued_at
                            ? new Date(inv.issued_at).toLocaleDateString("pt-PT", {
                                day: "2-digit", month: "2-digit", year: "numeric",
                                hour: "2-digit", minute: "2-digit",
                              })
                            : "—"}
                        </td>
                        <td className="py-2.5 pr-3 text-xs font-semibold" style={{ color: "var(--text)" }}>
                          {fmtEur(Number(inv.total_amount || 0))}
                        </td>
                        <td className="py-2.5">
                          <PayBadge status={inv.paymentStatus} />
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="flex flex-wrap items-center justify-between gap-2 mt-4 pt-3" style={{ borderTop: "1px solid var(--border)" }}>
            <p className="text-xs" style={{ color: "var(--text-muted)" }}>
              {filteredInvoices.length} faturas no total
            </p>
            <Pagination
              page={page}
              total={filteredInvoices.length}
              pageSize={FATURACAO_PAGE_SIZE}
              onChange={setPage}
            />
          </div>
        </div>

        {/* Detail panel — only rendered when a invoice is selected */}
        {selectedInv && (
        <div className="lg:col-span-2 rounded-[20px] bg-[var(--surface)] p-5 shadow-sm flex flex-col">
          <>
              {/* Header */}
              <div className="flex items-start justify-between mb-1">
                <div>
                  <h3 className="font-bold text-sm" style={{ color: "var(--text)" }}>
                    {fmtInvoiceNumber(selectedInv)}
                  </h3>
                  <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>
                    {selectedInv.customerName}
                  </p>
                  <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                    {selectedInv.tableLabel}
                    {selectedInv.paymentMethod !== "—" && ` · ${selectedInv.paymentMethod}`}
                  </p>
                </div>
                <button
                  onClick={() => setSelectedInv(null)}
                  className="p-1.5 rounded-lg text-xs"
                  style={{ background: "var(--surface-2)", color: "var(--text-muted)" }}
                >
                  <i className="fa-solid fa-xmark" />
                </button>
              </div>

              {/* Payment badge */}
              <div className="mb-4 mt-2">
                <PayBadge status={selectedInv.paymentStatus} />
              </div>

              {/* Items list */}
              <div className="flex-1 overflow-y-auto">
                <div
                  className="flex items-center justify-between pb-1.5 mb-1"
                  style={{ borderBottom: "1px solid var(--border)" }}
                >
                  <span className="text-xs font-semibold" style={{ color: "var(--text-muted)" }}>Item</span>
                  <span className="text-xs font-semibold" style={{ color: "var(--text-muted)" }}>Valor</span>
                </div>

                {detailItems.length === 0 ? (
                  <p className="text-xs py-3" style={{ color: "var(--text-muted)" }}>
                    Sem itens registados
                  </p>
                ) : (
                  <ul className="space-y-0">
                    {detailItems.map(item => (
                      <li
                        key={item.id}
                        className="flex items-center justify-between py-2"
                        style={{ borderBottom: "1px solid var(--border)" }}
                      >
                        <div>
                          <p className="text-xs font-medium" style={{ color: "var(--text)" }}>{item.name}</p>
                          <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                            {item.quantity}x &nbsp;·&nbsp; {fmtEur(item.unitPrice)}
                          </p>
                        </div>
                        <p className="text-xs font-semibold" style={{ color: "var(--text)" }}>
                          {fmtEur(item.total)}
                        </p>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              {/* Totals */}
              <div className="mt-4 pt-3 space-y-1.5" style={{ borderTop: "1px solid var(--border)" }}>
                <div className="flex items-center justify-between text-xs">
                  <span style={{ color: "var(--text-secondary)" }}>Subtotal</span>
                  <span style={{ color: "var(--text)" }}>{fmtEur(Number(selectedInv.subtotal_amount || 0))}</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span style={{ color: "var(--text-secondary)" }}>{ivaLabel}</span>
                  <span style={{ color: "var(--text)" }}>{fmtEur(Number(selectedInv.tax_amount || 0))}</span>
                </div>
                <div
                  className="flex items-center justify-between text-sm font-bold pt-2"
                  style={{ borderTop: "1px solid var(--border)", color: "var(--text)" }}
                >
                  <span>Total</span>
                  <span>{fmtEur(Number(selectedInv.total_amount || 0))}</span>
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-2 mt-4">
                <button
                  onClick={() => window.print()}
                  className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold hover:bg-[var(--surface-3)]"
                  style={{ background: "var(--surface-2)", color: "var(--text)", border: "1px solid var(--border)" }}
                >
                  <i className="fa-solid fa-print text-xs" />
                  Imprimir
                </button>
              </div>
          </>
        </div>
        )}

      </div>
    </PageSection>
  );
}
