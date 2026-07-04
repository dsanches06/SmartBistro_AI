// Cartão de estatística usado no dashboard do cliente (label, valor e subtítulo opcional).
export default function CustomerStatsCard({ label, value, sub }) {
  return (
    <div className="rounded-2xl p-5" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
      <p className="text-[10px] uppercase tracking-[0.18em] font-semibold" style={{ color: "var(--text-muted)" }}>{label}</p>
      <p className="mt-4 text-3xl font-bold" style={{ color: "var(--text)" }}>{value}</p>
      {sub && <p className="mt-2 text-sm" style={{ color: "var(--text-muted)" }}>{sub}</p>}
    </div>
  );
}
