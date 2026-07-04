import { useTheme } from "@/context/ThemeContext";

// Cartão de estatística genérico (label, valor grande, subtítulo opcional e ícone).
export function StatCard({ label, value, sub, icon, valueClassName, borderColor, className = "" }) {
  const { theme } = useTheme();
  const defaultValueClass = theme === "dark" ? "text-white" : "text-slate-900";
  const valueClass = valueClassName ?? defaultValueClass;

  return (
    <div
      className={`relative rounded-[24px] p-5 shadow-sm ${theme === "dark" ? "bg-[var(--surface)]" : "bg-white"} ${className}`}
      style={borderColor ? { borderLeft: `4px solid ${borderColor}` } : undefined}
    >
      {icon && (
        <div className="absolute right-4 top-4 inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-[var(--surface-2)] text-[var(--primary)] shadow-sm">
          <i className={`${icon} text-lg`} aria-hidden="true" />
        </div>
      )}
      <p className="text-[11px] sm:text-sm uppercase tracking-[0.12em] sm:tracking-[0.24em] text-[var(--text-secondary)] leading-snug">{label}</p>
      <p className={`mt-2 sm:mt-3 text-2xl sm:text-3xl font-bold ${valueClass}`}>{value}</p>
      {sub && <p className="mt-1 text-xs" style={{ color: "var(--text-muted)" }}>{sub}</p>}
    </div>
  );
}
