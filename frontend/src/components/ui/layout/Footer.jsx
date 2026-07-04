// Rodapé fixo com o aviso de direitos de autor, usado em todas as páginas.
export function Footer() {
  return (
    <footer
      className="flex items-center justify-center py-4"
      style={{ backgroundColor: 'var(--surface)', borderTop: '1px solid var(--border)' }}
    >
      <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
        &copy; 2026 Desenvolvido por Danilson Sanches.
      </p>
    </footer>
  );
}
