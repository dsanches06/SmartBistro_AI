// Preenche campos em falta/malformados da resposta do Gerente com os valores financeiros reais.
function repairCashierResponse(parsed, financials) {
  if (!parsed || typeof parsed !== "object") return parsed;

  const parseBoolean = (val) => {
    if (val === true) return true;
    if (typeof val === "string") {
      const normalized = String(val).trim().toLowerCase();
      return ["true", "yes", "ok", "1"].includes(normalized);
    }
    return Boolean(val);
  };

  const safeNumber = (value, fallback) => {
    const number = Number(value);
    return Number.isFinite(number) ? number : fallback;
  };

  return {
    ...parsed,
    success: parseBoolean(parsed.success ?? true),
    order_summary: String(parsed.order_summary ?? "").trim() ||
      `Pedido confirmado com total €${Number(financials.total).toFixed(2)}.`,
    invoice: {
      ...(parsed.invoice || {}),
      subtotal_amount: safeNumber(
        parsed.invoice?.subtotal_amount,
        financials.subtotal,
      ),
      tax_rate: safeNumber(parsed.invoice?.tax_rate, financials.taxRate),
      tax_amount: safeNumber(parsed.invoice?.tax_amount, financials.taxAmount),
      total_amount: safeNumber(parsed.invoice?.total_amount, financials.total),
    },
    payment: {
      method: String(parsed.payment?.method ?? "Pending"),
      status: String(parsed.payment?.status ?? "Pending"),
    },
    notes:
      parsed.notes == null || String(parsed.notes).trim() === ""
        ? null
        : String(parsed.notes),
    stock_warnings: Array.isArray(parsed.stock_warnings)
      ? parsed.stock_warnings
      : [],
    final_status:
      parsed.final_status == null
        ? "ready"
        : String(parsed.final_status).trim().toLowerCase(),
  };
}

export { repairCashierResponse };