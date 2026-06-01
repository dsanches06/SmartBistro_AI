import { useState } from "react";

const PALETTES = [
  { bg: "#EFF6FF", tx: "#1D4ED8" },
  { bg: "#F0FDF4", tx: "#166534" },
  { bg: "#FDF4FF", tx: "#7E22CE" },
  { bg: "#FFF7ED", tx: "#C2410C" },
  { bg: "#FEF2F2", tx: "#B91C1C" },
  { bg: "#ECFEFF", tx: "#0E7490" },
  { bg: "#FEF9C3", tx: "#92400E" },
  { bg: "#F5F3FF", tx: "#6D28D9" },
];

export function getPalette(id) {
  return PALETTES[((id || 1) - 1) % PALETTES.length];
}

export function getInitials(name) {
  return (name || "?")
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join("");
}

export function formatDate(dateStr) {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleDateString("pt-PT", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export default function CustomerCard({ customer, onDetail, onToggle, onDelete, delay = 0 }) {
  const [flipped, setFlipped] = useState(false);
  const [hovered, setHovered] = useState(false);
  const c = getPalette(customer.id);

  return (
    <div
      className="relative w-full animate-fadeInUp"
      style={{
        height: 122,
        perspective: 900,
        cursor: "pointer",
        transform: hovered ? "scale(1.02)" : "scale(1)",
        animationDelay: `${delay}ms`,
        transition: "transform 0.25s ease, box-shadow 0.25s ease",
        boxShadow: hovered
          ? "0 8px 20px rgba(0,0,0,0.14)"
          : "0 4px 10px rgba(0,0,0,0.08)",
      }}
      onClick={() => setFlipped((f) => !f)}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <div
        style={{
          position: "relative",
          width: "100%",
          height: "100%",
          transition: "transform 0.55s cubic-bezier(0.4,0,0.2,1)",
          transformStyle: "preserve-3d",
          transform: flipped ? "rotateY(180deg)" : "rotateY(0deg)",
        }}
      >
        {/* ── FRENTE ── */}
        <div
          style={{
            backfaceVisibility: "hidden",
            WebkitBackfaceVisibility: "hidden",
            backgroundColor: c.bg,
          }}
          className="absolute inset-0 rounded-xl border border-surface flex flex-col items-center justify-center gap-1 px-3 py-2 overflow-hidden"
        >
          <div
            className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 border"
            style={{
              backgroundColor: `${c.tx}18`,
              color: c.tx,
              borderColor: `${c.tx}30`,
            }}
          >
            {getInitials(customer.name)}
          </div>

          <div className="text-center leading-tight">
            <p className="text-[11px] font-semibold" style={{ color: c.tx }}>
              {customer.name}
            </p>
            <p className="text-[9px]" style={{ color: c.tx, opacity: 0.60 }}>
              {customer.phone || "sem telefone"}
            </p>
          </div>

          <span
            className={`inline-flex items-center gap-1 text-[9px] px-2 py-px rounded-full font-medium ${
              customer.active
                ? "bg-[#EAF3DE] text-[#3B6D11]"
                : "bg-[#FCEBEB] text-[#A32D2D]"
            }`}
          >
            ● {customer.active ? "Ativo" : "Inativo"}
          </span>
        </div>

        {/* ── VERSO ── */}
        <div
          style={{
            backfaceVisibility: "hidden",
            WebkitBackfaceVisibility: "hidden",
            transform: "rotateY(180deg)",
          }}
          className="absolute inset-0 rounded-xl border border-surface bg-surface-2 flex flex-col p-2 overflow-hidden"
        >
          <div className="flex items-center gap-1.5 mb-1">
            <div
              className="w-6 h-6 rounded-full flex items-center justify-center text-[9px] font-semibold flex-shrink-0"
              style={{ background: c.bg, color: c.tx }}
            >
              {getInitials(customer.name)}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[10px] font-semibold text-main truncate leading-tight">{customer.name}</p>
            </div>
            <span
              className={`text-[8px] px-1.5 py-px rounded-full font-medium flex-shrink-0 ${
                customer.active
                  ? "bg-[#EAF3DE] text-[#3B6D11]"
                  : "bg-[#FCEBEB] text-[#A32D2D]"
              }`}
            >
              {customer.active ? "Ativo" : "Inativo"}
            </span>
          </div>

          <ul className="flex flex-col gap-px text-[9px] flex-1">
            {[
              { label: "Tel",  value: customer.phone || "—" },
              { label: "Data", value: formatDate(customer.created_at) },
            ].map(({ label, value }) => (
              <li key={label} className="flex items-center justify-between text-muted">
                <span>{label}</span>
                <strong className="text-main font-medium">{value}</strong>
              </li>
            ))}
          </ul>

          <div className="flex gap-1 pt-1 border-t border-surface mt-auto">
            {[
              {
                iconClass: "fas fa-user-circle",
                title: "Ver perfil",
                colorHover: "hover:bg-[#E6F1FB] hover:text-[#185FA5]",
                onClick: () => onDetail?.(customer),
              },
              {
                iconClass: customer.active ? "fas fa-toggle-on" : "fas fa-toggle-off",
                title: customer.active ? "Desativar" : "Ativar",
                colorHover: "hover:bg-[#FAEEDA] hover:text-[#854F0B]",
                onClick: () => onToggle?.(customer.id),
              },
              {
                iconClass: "fas fa-trash",
                title: "Remover",
                colorHover: "hover:bg-[#FCEBEB] hover:text-[#A32D2D]",
                onClick: () => onDelete?.(customer.id),
              },
            ].map(({ iconClass, title, colorHover, onClick }) => (
              <button
                key={title}
                title={title}
                className={`w-8 h-8 rounded-md border border-surface bg-surface flex items-center justify-center text-sm text-muted transition-colors ${colorHover} cursor-pointer`}
                onClick={(e) => { e.stopPropagation(); onClick(); }}
              >
                <i className={iconClass} aria-hidden="true" />
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
