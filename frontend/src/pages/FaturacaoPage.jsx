import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
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

// ── main component ────────────────────────────────────────────────────────────

export default function FaturacaoPage() {
  const { theme } = useTheme();
  const isDark = theme === "dark";

  const [dateFrom, setDateFrom]     = useState(THIRTY_DAYS_AGO);
  const [dateTo, setDateTo]         = useState(TODAY);
  const [page, setPage]             = useState(1);
  const [selectedInv, setSelectedInv] = useState(null);

  const { data: invoices   = [] } = useQuery({ queryKey: ["invoices"],    queryFn: invoiceService.getAll });
  const { data: orders     = [] } = useQuery({ queryKey: ["orders"],      queryFn: orderService.getAll });
  const { data: payments   = [] } = useQuery({ queryKey: ["payments"],    queryFn: paymentService.getAll });
  const { data: orderItems = [] } = useQuery({ queryKey: ["order-items"], queryFn: orderItemService.getAll });
  const { data: menuItems  = [] } = useQuery({ queryKey: ["items"],       queryFn: itemService.getAll });

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
  const kpis = useMemo(() => {
    const count    = filteredInvoices.length;
    const total    = filteredInvoices.reduce((s, i) => s + Number(i.total_amount    || 0), 0);
    const taxTotal = filteredInvoices.reduce((s, i) => s + Number(i.tax_amount || 0), 0);
    const avgTicket = count > 0 ? total / count : 0;
    return { count, total, taxTotal, avgTicket };
  }, [filteredInvoices]);

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

      {/* Date filter + Exportar */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <div className="flex flex-wrap items-center gap-2">
          <label className="text-xs font-medium" style={{ color: "var(--text-muted)" }}>De</label>
          <input
            type="date"
            value={dateFrom}
            onChange={e => { setDateFrom(e.target.value); setPage(1); }}
            style={inputStyle}
          />
          <label className="text-xs font-medium" style={{ color: "var(--text-muted)" }}>Até</label>
          <input
            type="date"
            value={dateTo}
            onChange={e => { setDateTo(e.target.value); setPage(1); }}
            style={inputStyle}
          />
        </div>
        <button
          onClick={() => exportInvoicesCSV(filteredInvoices)}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold"
          style={{ background: "var(--surface-2)", color: "var(--text)", border: "1px solid var(--border)" }}
          onMouseEnter={e => { e.currentTarget.style.background = "var(--surface-3)"; }}
          onMouseLeave={e => { e.currentTarget.style.background = "var(--surface-2)"; }}
        >
          <i className="fa-solid fa-download text-xs" />
          Exportar
        </button>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard label="Faturação Total" value={fmtEur(kpis.total)} />
        <StatCard label="Nº Faturas"      value={kpis.count} />
        <StatCard label="Ticket Médio"    value={fmtEur(kpis.avgTicket)} />
        <StatCard label="IVA Total"       value={fmtEur(kpis.taxTotal)} />
      </div>

      {/* Table + Detail */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">

        {/* Invoice table */}
        <div className="lg:col-span-3 rounded-[20px] bg-[var(--surface)] p-5 shadow-sm">
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
                        className="cursor-pointer"
                        style={{
                          borderBottom: "1px solid var(--border)",
                          background: active
                            ? (isDark ? "rgba(37,99,235,0.12)" : "rgba(37,99,235,0.07)")
                            : "",
                        }}
                        onMouseEnter={e => { if (!active) e.currentTarget.style.background = "var(--surface-2)"; }}
                        onMouseLeave={e => { if (!active) e.currentTarget.style.background = ""; }}
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

        {/* Detail panel */}
        <div className="lg:col-span-2 rounded-[20px] bg-[var(--surface)] p-5 shadow-sm flex flex-col">
          {!selectedInv ? (
            <div className="flex flex-col items-center justify-center flex-1 min-h-[260px] gap-3">
              <i className="fa-solid fa-file-invoice text-4xl" style={{ color: "var(--border)" }} />
              <p className="text-sm" style={{ color: "var(--text-muted)" }}>
                Clique numa fatura para ver o detalhe
              </p>
            </div>
          ) : (
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
                  className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold"
                  style={{ background: "var(--surface-2)", color: "var(--text)", border: "1px solid var(--border)" }}
                  onMouseEnter={e => { e.currentTarget.style.background = "var(--surface-3)"; }}
                  onMouseLeave={e => { e.currentTarget.style.background = "var(--surface-2)"; }}
                >
                  <i className="fa-solid fa-print text-xs" />
                  Imprimir
                </button>
                <button
                  className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold"
                  style={{ background: "var(--primary)", color: "#ffffff" }}
                  onMouseEnter={e => { e.currentTarget.style.opacity = "0.88"; }}
                  onMouseLeave={e => { e.currentTarget.style.opacity = "1"; }}
                >
                  <i className="fa-solid fa-paper-plane text-xs" />
                  Enviar
                </button>
              </div>
            </>
          )}
        </div>

      </div>
    </PageSection>
  );
}
