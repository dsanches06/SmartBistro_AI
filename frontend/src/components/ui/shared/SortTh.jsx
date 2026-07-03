import { ThBadge } from "./ThBadge.jsx";

/** Cabeçalho de tabela clicável para ordenação asc/desc. */
export function SortTh({ children, col, sortCol, sortDir, onSort, className = "", style = {} }) {
  const active = sortCol === col;
  return (
    <th
      onClick={() => onSort(col)}
      className={`py-3 px-4 select-none cursor-pointer transition-colors ${className}`}
      style={style}
    >
      <span className="flex items-center gap-1.5">
        <ThBadge style={active ? { color: "var(--primary)", borderColor: "var(--primary)" } : undefined}>
          {children}
        </ThBadge>
        <i className={`fa-solid text-[10px] ${
          active
            ? sortDir === "asc" ? "fa-arrow-up" : "fa-arrow-down"
            : "fa-arrows-up-down opacity-30"
        }`} style={{ color: active ? "var(--primary)" : "var(--text-secondary)" }} />
      </span>
    </th>
  );
}
