/**
 * Contentor visual reutilizável para cards de lista (mobile).
 * Fornece o estilo consistente; o conteúdo é passado via children.
 */
export function ListCard({ children, className = "", style = {} }) {
  return (
    <div
      className={`rounded-2xl px-4 py-3 flex flex-col gap-1.5 ${className}`}
      style={{
        background: "var(--surface)",
        border: "1px solid var(--border)",
        boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
        ...style,
      }}
    >
      {children}
    </div>
  );
}
