import { useTheme } from "@/context/ThemeContext";

export function StatCard({ label, value, icon, valueClassName, borderColor, className = "" }) {
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
      <p className="text-sm uppercase tracking-[0.24em] text-[var(--text-secondary)]">{label}</p>
      <p className={`mt-3 text-3xl font-bold ${valueClass}`}>{value}</p>
    </div>
  );
}
