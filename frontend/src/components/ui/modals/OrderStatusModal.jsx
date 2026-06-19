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
        <div className="relative">
          {/* Linha de fundo */}
          <div className="absolute h-[2px] top-5 left-5 right-5" style={{ background: "var(--border)" }} />
          {/* Linha de progresso */}
          <div
            className="absolute h-[2px] top-5 left-5 transition-all duration-500"
            style={{
              background: "var(--primary)",
              width: orderSteps.length > 1
                ? `calc(${(Math.min(currentStep, orderSteps.length - 1) / (orderSteps.length - 1)) * 100}% - 0px)`
                : "0%",
            }}
          />
          <div className="relative flex justify-between">
            {orderSteps.map((step, index) => {
              const completed = index < currentStep;
              const active = index === currentStep;
              const filled = completed || active;
              return (
                <div key={step.key} className="flex flex-col items-center gap-2">
                  <div
                    className="w-10 h-10 rounded-full flex items-center justify-center z-10 transition-colors duration-300"
                    style={{
                      background: filled ? "var(--primary)" : "var(--surface)",
                      border: `2px solid ${filled ? "var(--primary)" : "var(--border)"}`,
                    }}
                  >
                    {completed ? (
                      <i className="fa-solid fa-check text-white text-xs" />
                    ) : (
                      <i
                        className={`fa-solid ${step.icon ?? "fa-circle"} text-xs`}
                        style={{ color: active ? "#fff" : "var(--text-muted)" }}
                      />
                    )}
                  </div>
                  <p
                    className="text-[11px] text-center leading-tight"
                    style={{ color: active ? "var(--text)" : "var(--text-muted)", fontWeight: active ? 600 : 400 }}
                  >
                    {step.label}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </Modal>
  );
}
