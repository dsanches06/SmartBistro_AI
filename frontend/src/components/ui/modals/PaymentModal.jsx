import { useEffect, useRef, useState } from "react";
import Modal from "./Modal.jsx";
import { paymentService } from "@/services/paymentService";
import { PAYMENT_METHODS } from "@/utils";
import { useAuth } from "@/context/AuthContext";
import { fetchPoints, redeemPoints } from "@/services/pointsService.js";

export function PaymentModal({ onClose, unpaidInvoices, onPaid, userId }) {
  const { token } = useAuth();
  const [method, setMethod]   = useState(PAYMENT_METHODS[0].value);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError]     = useState("");

  // Programa de pontos
  const [pointsData, setPointsData]   = useState(null);
  const [pointsToUse, setPointsToUse] = useState(0);
  const [discount, setDiscount]       = useState(0);
  const discountRef                   = useRef(0);

  const grandTotal = unpaidInvoices.reduce((s, { inv }) => s + Number(inv?.total_amount ?? 0), 0);
  const finalTotal = Math.max(0, grandTotal - discount);

  // Busca saldo do cliente ao abrir (só se tiver userId e for cliente)
  useEffect(() => {
    if (!userId || !token) return;
    fetchPoints(token, userId).then(d => { if (d?.canRedeem) setPointsData(d); }).catch(() => {});
  }, [userId, token]);

  // Resgata pontos e actualiza desconto
  const handleApplyPoints = async () => {
    if (!pointsData || pointsToUse < 50) return;
    try {
      const result = await redeemPoints(token, userId, pointsToUse);
      discountRef.current = result.discount;
      setDiscount(result.discount);
      setPointsData(prev => prev ? { ...prev, balance: prev.balance - pointsToUse, canRedeem: false } : prev);
    } catch (e) {
      setError(e.message || "Erro ao resgatar pontos.");
    }
  };

  const handlePay = async () => {
    if (!unpaidInvoices.length) return;
    setError("");
    setLoading(true);
    try {
      // Se há desconto, aplica ao primeiro pagamento (valor proporcional)
      const disc = discountRef.current;
      await Promise.all(
        unpaidInvoices.map(({ inv }, i) => {
          const origAmount = Number(inv.total_amount);
          const amount     = i === 0 ? Math.max(0, origAmount - disc) : origAmount;
          return paymentService.create({
            invoice_id:     inv.id,
            user_id:        userId ?? null,
            amount,
            payment_method: method,
            payment_status: "Completed",
          }).catch(err => { if (!err?.message?.includes('409')) throw err; });
        })
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
          <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>Pagamento confirmado! O teu pedido vai para preparação.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-4">

          {/* Resumo das faturas */}
          <div className="rounded-xl overflow-hidden" style={{ border: "1px solid var(--border)" }}>
            {unpaidInvoices.map(({ inv }, i) => (
              <div key={inv.id} className="flex items-center justify-between px-4 py-2.5"
                style={{ borderBottom: i < unpaidInvoices.length - 1 ? "1px solid var(--border)" : "none", background: "var(--surface-2)" }}>
                <span className="text-xs" style={{ color: "var(--text-muted)" }}>Pedido #{String(inv.id).slice(0, 8)}</span>
                <span className="text-xs font-semibold" style={{ color: "var(--text)" }}>{Number(inv.total_amount).toFixed(2)} €</span>
              </div>
            ))}
          </div>

          {/* Pontos — só aparece se cliente tiver ≥50 pontos */}
          {pointsData && discount === 0 && (
            <div className="rounded-xl p-3 flex flex-col gap-2" style={{ background: "rgba(99,102,241,0.08)", border: "1px solid rgba(99,102,241,0.25)" }}>
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold flex items-center gap-1.5" style={{ color: "var(--primary)" }}>
                  ⭐ {pointsData.balance} pontos disponíveis
                </span>
                <span className="text-[10px]" style={{ color: "var(--text-muted)" }}>1 pt = €0,10</span>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="number" min={50} max={pointsData.balance} step={10}
                  value={pointsToUse}
                  onChange={e => setPointsToUse(Math.min(pointsData.balance, Math.max(0, parseInt(e.target.value) || 0)))}
                  className="flex-1 rounded-lg px-2 py-1 text-sm text-right outline-none"
                  style={{ background: "var(--surface)", border: "1px solid var(--border)", color: "var(--text)" }}
                  placeholder="pts"
                />
                <button onClick={handleApplyPoints} disabled={pointsToUse < 50}
                  className="px-3 py-1.5 rounded-lg text-xs font-bold text-white disabled:opacity-50"
                  style={{ background: "var(--primary)" }}>
                  Aplicar
                </button>
              </div>
              <p className="text-[10px]" style={{ color: "var(--text-muted)" }}>Mínimo 50 pontos · Desconto: €{(pointsToUse * 0.10).toFixed(2)}</p>
            </div>
          )}

          {/* Desconto aplicado */}
          {discount > 0 && (
            <div className="flex items-center justify-between px-3 py-2 rounded-xl"
              style={{ background: "rgba(34,197,94,0.08)", border: "1px solid rgba(34,197,94,0.2)" }}>
              <span className="text-xs font-semibold" style={{ color: "#22c55e" }}>⭐ {pointsToUse} pontos usados</span>
              <span className="text-sm font-bold" style={{ color: "#22c55e" }}>− €{discount.toFixed(2)}</span>
            </div>
          )}

          {/* Total */}
          <div className="flex items-center justify-between px-4 py-3 rounded-xl"
            style={{ background: "var(--surface-2)", border: "1px solid var(--border)" }}>
            <span className="text-sm font-semibold" style={{ color: "var(--text-muted)" }}>
              Total {unpaidInvoices.length > 1 ? `(${unpaidInvoices.length} pedidos)` : ""}
            </span>
            <div className="flex items-center gap-2">
              {discount > 0 && (
                <span className="text-sm line-through" style={{ color: "var(--text-muted)" }}>{grandTotal.toFixed(2)} €</span>
              )}
              <span className="text-xl font-bold" style={{ color: "var(--primary)" }}>{finalTotal.toFixed(2)} €</span>
            </div>
          </div>

          {/* Método de pagamento */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>
              Método de pagamento
            </label>
            <div className="grid grid-cols-2 gap-2">
              {PAYMENT_METHODS.map(({ value, label }) => (
                <button key={value} onClick={() => setMethod(value)}
                  className="py-2 px-3 rounded-xl text-xs font-semibold transition-all text-left"
                  style={{
                    background: method === value ? "var(--primary)" : "var(--surface-2)",
                    color: method === value ? "#fff" : "var(--text-secondary)",
                    border: method === value ? "1.5px solid var(--primary)" : "1.5px solid var(--border)",
                  }}>
                  {label}
                </button>
              ))}
            </div>
          </div>

          {error && (
            <p className="text-xs px-3 py-2 rounded-lg" style={{ background: "rgba(239,68,68,0.1)", color: "#ef4444" }}>{error}</p>
          )}

          <button onClick={handlePay} disabled={loading || !unpaidInvoices.length}
            className="w-full py-3 rounded-2xl text-sm font-bold text-white disabled:opacity-60"
            style={{ background: "var(--primary)" }}>
            {loading ? "A processar..." : `Pagar ${finalTotal.toFixed(2)} €`}
          </button>
        </div>
      )}
    </Modal>
  );
}
