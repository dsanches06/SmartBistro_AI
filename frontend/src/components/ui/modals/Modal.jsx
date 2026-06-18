import { useEffect, useRef } from "react";

function IconClose() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );
}

export default function Modal({ open, onClose, title, children, isDark, size = "lg" }) {
  const overlayRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    const handleKey = (e) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-[100] p-4"
      style={{
        display: "grid",
        placeItems: "center",
        minHeight: "100vh",
        background: isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.6)",
        backdropFilter: "blur(4px)",
      }}
      onClick={(e) => {
        if (e.target === overlayRef.current) onClose();
      }}
    >
      <div
        className={`w-full ${size === "xs" ? "max-w-xs" : size === "sm" ? "max-w-sm" : size === "md" ? "max-w-md" : "max-w-lg"} rounded-2xl p-6 shadow-2xl`}
        style={{
          background: "var(--surface)",
          border: "1px solid var(--border)",
        }}
      >
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-bold" style={{ color: "var(--text)" }}>{title}</h2>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg transition-colors hover:bg-[var(--surface-2)]"
            style={{ color: "var(--text-muted)" }}
            aria-label="Fechar modal"
          >
            <IconClose />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
