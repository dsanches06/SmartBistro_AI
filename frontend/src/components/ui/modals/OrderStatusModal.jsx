import Modal from "./Modal.jsx";
import { getOrderSteps, getOrderStepIndex, ORDER_STATUS_META } from "@/utils/orderUtils";

export default function OrderStatusModal({ order, onClose }) {
  if (!order) return null;

  const orderSteps = getOrderSteps(order);
  const currentStep = getOrderStepIndex(order);
  const currentStepMeta = orderSteps[currentStep] ?? orderSteps[orderSteps.length - 1];
  const statusLabel = currentStepMeta?.label || ORDER_STATUS_META[order.order_status]?.label || order.order_status;
  const statusColor = ORDER_STATUS_META[order.order_status]?.color || "var(--text)";

  return (
    <Modal open onClose={onClose} title={`Pedido #${order.id}`} size="lg">
      <div className="mb-6 rounded-3xl bg-[var(--surface-2)] p-4">
        <p className="text-sm font-medium" style={{ color: "var(--text)" }}>Status atual:</p>
        <p className="mt-2 text-lg font-semibold" style={{ color: statusColor }}>
          {statusLabel}
        </p>
      </div>

      <div className="rounded-3xl bg-[var(--surface)] p-6">
        <div className="relative flex items-center justify-between gap-3">
          {orderSteps.map((step, index) => {
            const completed = index < currentStep;
            const active = index === currentStep;
            return (
              <div key={step.key} className="flex-1">
                <div className="relative flex items-center justify-center">
                  <div className={`h-10 w-10 rounded-full border flex items-center justify-center ${completed || active ? "bg-[var(--primary)] border-[var(--primary)] text-white" : "bg-[var(--surface)] border-[var(--border)] text-[var(--text-muted)]"}`}>
                    {(completed || active) ? <span className="text-xs font-bold">✓</span> : <span className="text-sm font-semibold">{index + 1}</span>}
                  </div>
                  {index < orderSteps.length - 1 && (
                    <div className={`absolute right-[-50%] top-1/2 h-[2px] w-full ${index < currentStep ? "bg-[var(--primary)]" : "bg-[var(--border)]"}`} style={{ transform: "translateY(-50%)" }} />
                  )}
                </div>
                <p className={`mt-3 text-[11px] text-center ${active ? "text-[var(--text)] font-semibold" : "text-[var(--text-muted)]"}`}>{step.label}</p>
              </div>
            );
          })}
        </div>
      </div>
    </Modal>
  );
}
