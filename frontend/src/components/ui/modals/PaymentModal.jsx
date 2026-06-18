import { useState } from "react";
import Modal from "./Modal.jsx";
import { orderService }   from "@/services/orderService";
import { paymentService } from "@/services/paymentService";
import { PAYMENT_METHODS } from "@/utils";

export function PaymentModal({ onClose, unpaidInvoices, onPaid, customerId }) {
  const [method, setMethod]   = useState(PAYMENT_METHODS[0].value);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError]     = useState("");

  const grandTotal = unpaidInvoices.reduce((s, { inv }) => s + Number(inv?.total_amount ?? 0), 0);

  const handlePay = async () => {
    if (!unpaidInvoices.length) return;
    setError("");
    setLoading(true);
    try {
      // Cria um pagamento por fatura + marca cada pedido como Entregue
      await Promise.all(
        unpaidInvoices.map(({ inv, orderId }) =>
          paymentService.create({
            invoice_id:     inv.id,
            customer_id:    customerId ?? null,
            amount:         Number(inv.total_amount),
            payment_method: method,
            payment_status: "Completed",
          })
          .catch(err => {
            // 409 = já existe pagamento para esta fatura — ignora e avança pedido
            if (!err?.message?.includes('409')) throw err;
          })
          .then(() =>
            orderId
              ? orderService.updateStatus(orderId, "Delivered").catch(() => {})
              : Promise.resolve()
          )
        )
      );
      setSuccess(true);
      setTimeout(() => { onPaid(); onClose(); }, 1500);
    } catch (e) {
      setError(e?.message || "Erro ao processar pagamento.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal open onClose={onClose} title="Efectuar pagamento" size="sm">
      {success ? (
        <div className="text-center py-6">
          <i className="fa-solid fa-circle-check text-4xl mb-3" style={{ color: "#22c55e" }} />
          <p className="font-semibold text-sm" style={{ color: "var(--text)" }}>Pagamento registado!</p>
          <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>Os teus pedidos foram marcados como entregues.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
            {/* Resumo das faturas */}
            <div className="rounded-xl overflow-hidden" style={{ border: "1px solid var(--border)" }}>
              {unpaidInvoices.map(({ inv }, i) => (
                <div key={inv.id} className="flex items-center justify-between px-4 py-2.5"
                  style={{ borderBottom: i < unpaidInvoices.length - 1 ? "1px solid var(--border)" : "none", background: "var(--surface-2)" }}>
                  <span className="text-xs" style={{ color: "var(--text-muted)" }}>
                    Pedido #{String(inv.id).slice(0, 8)}
                  </span>
                  <span className="text-xs font-semibold" style={{ color: "var(--text)" }}>
                    {Number(inv.total_amount).toFixed(2)} €
                  </span>
                </div>
              ))}
            </div>

            {/* Total consolidado */}
            <div className="flex items-center justify-between px-4 py-3 rounded-xl"
              style={{ background: "var(--surface-2)", border: "1px solid var(--border)" }}>
              <span className="text-sm font-semibold" style={{ color: "var(--text-muted)" }}>
                Total {unpaidInvoices.length > 1 ? `(${unpaidInvoices.length} pedidos)` : ""}
              </span>
              <span className="text-xl font-bold" style={{ color: "var(--primary)" }}>
                {grandTotal.toFixed(2)} €
              </span>
            </div>

            {/* Método de pagamento */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>
                Método de pagamento
              </label>
              <div className="grid grid-cols-2 gap-2">
                {PAYMENT_METHODS.map(({ value, label }) => (
                  <button
                    key={value}
                    onClick={() => setMethod(value)}
                    className="py-2 px-3 rounded-xl text-xs font-semibold transition-all text-left"
                    style={{
                      background: method === value ? "var(--primary)" : "var(--surface-2)",
                      color: method === value ? "#fff" : "var(--text-secondary)",
                      border: method === value ? "1.5px solid var(--primary)" : "1.5px solid var(--border)",
                    }}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {error && (
              <p className="text-xs px-3 py-2 rounded-lg" style={{ background: "rgba(239,68,68,0.1)", color: "#ef4444" }}>
                {error}
              </p>
            )}

            <button
              onClick={handlePay}
              disabled={loading || !unpaidInvoices.length}
              className="w-full py-3 rounded-2xl text-sm font-bold text-white disabled:opacity-60"
              style={{ background: "var(--primary)" }}
            >
              {loading ? "A processar..." : `Pagar ${grandTotal.toFixed(2)} €`}
            </button>
          </div>
        )}
      </Modal>
  );
}
