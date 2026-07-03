// Utilitários e constantes da página de Faturação

// Nº de faturas mostradas por página.
export const FATURACAO_PAGE_SIZE = 8;

// Metadados (rótulo + cores) de cada estado de pagamento.
export const PAYMENT_STATUS_META = {
  Completed: { label: "Paga",          bg: "#f0fdf4", color: "#22c55e", text: "#166534" },
  Pending:   { label: "Pendente",      bg: "#fff7ed", color: "#f97316", text: "#9a3412" },
  Failed:    { label: "Falhada",       bg: "#fef2f2", color: "#ef4444", text: "#991b1b" },
  none:      { label: "Sem pagamento", bg: "#f9fafb", color: "#9ca3af", text: "#4b5563" },
};

// Métodos de pagamento suportados, para preencher selects/dropdowns.
export const PAYMENT_METHODS = [
  { value: "MB Way",       label: "MB Way" },
  { value: "Multibanco",   label: "Multibanco" },
  { value: "Credit Card",  label: "Cartão de Crédito" },
  { value: "Cash",         label: "Numerário" },
];

// Formata o número de fatura no formato "FT <ano>/<id>".
export function fmtInvoiceNumber(invoice) {
  const year = invoice.issued_at
    ? new Date(invoice.issued_at).getFullYear()
    : new Date().getFullYear();
  return `FT ${year}/${invoice.id}`;
}

// Exporta a lista de faturas para um ficheiro CSV e despoleta o download.
export function exportInvoicesCSV(invoices) {
  const header = ["Nº Fatura", "Cliente", "Mesa", "Data", "Subtotal", "IVA", "Total", "Estado"];
  const rows = invoices.map(inv => [
    fmtInvoiceNumber(inv),
    inv.customerName ?? "—",
    inv.tableLabel ?? "—",
    inv.issued_at ? new Date(inv.issued_at).toLocaleDateString("pt-PT") : "—",
    Number(inv.subtotal_amount || 0).toFixed(2),
    Number(inv.tax_amount || 0).toFixed(2),
    Number(inv.total_amount || 0).toFixed(2),
    PAYMENT_STATUS_META[inv.paymentStatus]?.label ?? "—",
  ]);
  const csv = [header, ...rows].map(r => r.map(c => `"${c}"`).join(";")).join("\n");
  const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `faturas_${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}
