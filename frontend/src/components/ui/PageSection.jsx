// Layout de página — mantém a mesma altura/largura de TablePage e aceita conteúdo filho.
export function PageSection({ title, description, children }) {
  if (children) {
    return (
      <div className="min-h-full p-6 bg-[var(--bg)] text-[var(--text)]">
        <div className="mx-auto max-w-[1200px] space-y-6">
          {children}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-full p-6 bg-[var(--bg)] text-[var(--text)]">
      <div className="mx-auto max-w-[1200px] space-y-6">
        <div className="rounded-[32px] bg-surface p-6 shadow-sm">
          <div className="mb-6">
            <h2 className="text-3xl font-bold" style={{ color: 'var(--text)' }}>{title}</h2>
            {description && (
              <p className="mt-2 text-sm text-[var(--text-secondary)]">{description}</p>
            )}
          </div>
          <div className="rounded-3xl bg-surface-2 p-6" style={{ border: '1px solid var(--border)' }}>
            <p className="text-lg" style={{ color: 'var(--text)' }}>
              Página de <span className="font-semibold">{title}</span>. Conteúdo específico será adicionado em breve.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
