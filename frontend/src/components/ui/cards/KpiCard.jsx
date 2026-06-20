/**
 * KpiCard — cartão de KPI com ícone colorido à esquerda e indicador de tendência opcional.
 *
 * Props:
 *   faIcon     — classe Font Awesome  (ex: "fa-solid fa-clipboard-list")
 *   iconColor  — cor do ícone         (ex: "#e11d48")
 *   iconBg     — fundo do ícone       (ex: "rgba(225,29,72,0.12)")
 *   label      — legenda pequena
 *   value      — valor principal
 *   pct        — percentagem de variação (número, null = ocultar)
 *   up         — true = sobe, false = desce (null = sem seta)
 *   sub        — texto secundário abaixo do valor
 */
export function KpiCard({ faIcon, iconColor, iconBg, label, value, pct = null, up = null, sub, onClick }) {
  const Tag = onClick ? "button" : "div";
  return (
    <Tag
      type={onClick ? "button" : undefined}
      onClick={onClick}
      className={`rounded-[20px] bg-[var(--surface)] p-4 sm:p-5 shadow-sm flex items-start gap-3 text-left w-full${onClick ? " hover:bg-[var(--surface-2)] transition-colors cursor-pointer active:scale-[0.98]" : ""}`}
    >
      <div
        className="flex-shrink-0 w-10 h-10 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl flex items-center justify-center"
        style={{ background: iconBg }}
      >
        <i className={`${faIcon} text-base sm:text-lg`} style={{ color: iconColor }} />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[11px] sm:text-xs font-medium truncate" style={{ color: "var(--text-muted)" }}>
          {label}
        </p>
        <p className="text-lg sm:text-2xl font-bold mt-0.5 leading-tight truncate" style={{ color: "var(--text)" }}>
          {value}
        </p>
        {pct !== null && up !== null && (
          <p className="text-[11px] sm:text-xs mt-1 font-medium" style={{ color: up ? "#22c55e" : "#ef4444" }}>
            {up ? "↑" : "↓"} {Math.abs(pct)}%{" "}
            <span className="hidden sm:inline" style={{ color: "var(--text-muted)", fontWeight: 400 }}>vs ontem</span>
          </p>
        )}
        {sub && (
          <p className="text-[11px] sm:text-xs mt-1 truncate" style={{ color: "var(--text-muted)" }}>
            {sub}
          </p>
        )}
      </div>
    </Tag>
  );
}
