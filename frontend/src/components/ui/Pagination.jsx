/** Calcula os slots visíveis (números de página ou '…') */
function buildPageSlots(page, total) {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);

  const slots = [1];

  if (page <= 3) {
    for (let i = 2; i <= Math.min(3, total - 1); i++) slots.push(i);
    slots.push("…");
  } else if (page >= total - 2) {
    slots.push("…");
    for (let i = Math.max(2, total - 2); i < total; i++) slots.push(i);
  } else {
    slots.push("…");
    slots.push(page - 1);
    slots.push(page);
    slots.push(page + 1);
    slots.push("…");
  }

  slots.push(total);
  return slots;
}

function PagBtn({ children, active, disabled, onClick }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="min-w-[2rem] h-8 px-1 flex items-center justify-center rounded-lg text-sm font-semibold transition-colors disabled:opacity-40"
      style={{
        background: active ? "var(--primary)" : "transparent",
        color: active ? "#fff" : "var(--text-secondary)",
      }}
      onMouseEnter={e => { if (!active && !disabled) e.currentTarget.style.background = "var(--surface-2)"; }}
      onMouseLeave={e => { if (!active) e.currentTarget.style.background = "transparent"; }}
    >
      {children}
    </button>
  );
}

/**
 * Paginação reutilizável.
 * @param {number}   page      — página atual (1-based)
 * @param {number}   total     — total de itens
 * @param {number}   pageSize  — itens por página (default 10)
 * @param {Function} onChange  — callback(newPage: number)
 */
export function Pagination({ page, total, pageSize = 10, onChange }) {
  const pages = Math.max(1, Math.ceil(total / pageSize));
  if (pages <= 1) return null;

  const slots = buildPageSlots(page, pages);

  return (
    <div className="flex items-center gap-0.5">
      <PagBtn onClick={() => onChange(Math.max(1, page - 1))} disabled={page === 1}>
        <i className="fa-solid fa-chevron-left text-xs" />
      </PagBtn>

      {slots.map((s, i) =>
        s === "…" ? (
          <span
            key={`ellipsis-${i}`}
            className="min-w-[2rem] h-8 flex items-center justify-center text-sm select-none"
            style={{ color: "var(--text-muted)" }}
          >
            …
          </span>
        ) : (
          <PagBtn key={s} active={s === page} onClick={() => onChange(s)}>
            {s}
          </PagBtn>
        ),
      )}

      <PagBtn onClick={() => onChange(Math.min(pages, page + 1))} disabled={page === pages}>
        <i className="fa-solid fa-chevron-right text-xs" />
      </PagBtn>
    </div>
  );
}
