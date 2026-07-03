/** Badge (pill) usado nos títulos de cabeçalhos de tabela (thead). */
export function ThBadge({ children, className = "", style = {} }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold whitespace-nowrap normal-case ${className}`}
      style={{ background: "var(--surface)", color: "var(--text-secondary)", border: "1px solid var(--border)", ...style }}
    >
      {children}
    </span>
  );
}
