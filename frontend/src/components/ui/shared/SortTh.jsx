/** Cabeçalho de tabela clicável para ordenação asc/desc. */
export function SortTh({ children, col, sortCol, sortDir, onSort, className = "", style = {} }) {
  const active = sortCol === col;
  return (
    <th
      onClick={() => onSort(col)}
      className={`py-3 px-4 text-xs font-semibold uppercase tracking-wider select-none cursor-pointer transition-colors hover:text-[var(--primary)] ${className}`}
      style={{ color: active ? "var(--primary)" : "var(--text-secondary)", ...style }}
    >
      <span className="flex items-center gap-1">
        {children}
        <i className={`fa-solid text-[10px] ${
          active
            ? sortDir === "asc" ? "fa-arrow-up" : "fa-arrow-down"
            : "fa-arrows-up-down opacity-30"
        }`} />
      </span>
    </th>
  );
}
