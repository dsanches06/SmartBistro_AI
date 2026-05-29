const socialLinks = [
  {
    id: 'linkedin',
    href: 'https://www.linkedin.com/in/danilson-sanches/',
    icon: 'fa-brands fa-linkedin',
    label: 'O meu perfil de LinkedIn',
    external: true,
  },
  {
    id: 'github',
    href: 'https://github.com/dsanches06',
    icon: 'fa-brands fa-square-github',
    label: 'O meu perfil de GitHub',
    external: true,
  },
  {
    id: 'phone',
    href: 'tel:+351123456789',
    icon: 'fa-solid fa-phone',
    label: 'O meu contacto telefónico',
    external: false,
  },
  {
    id: 'email',
    href: 'mailto:dsanches06@outlook.com',
    icon: 'fa-solid fa-envelope',
    label: 'O meu email',
    external: false,
  },
];

export function Footer() {
  return (
    <footer
      className="flex flex-col items-center py-6 gap-3"
      style={{ backgroundColor: 'var(--surface)', borderTop: '1px solid var(--border)' }}
    >
      <div className="flex gap-2" role="region" aria-label="Redes sociais e contactos">
        {socialLinks.map(({ id, href, icon, label, external }) => (
          <a
            key={id}
            href={href}
            aria-label={label}
            {...(external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
            className="flex items-center justify-center w-10 h-10 rounded transition-all duration-200 hover:scale-110"
            style={{ color: 'var(--text-muted)' }}
            onMouseOver={e => {
              e.currentTarget.style.color = 'var(--text)';
              e.currentTarget.style.backgroundColor = 'var(--surface-2)';
            }}
            onMouseOut={e => {
              e.currentTarget.style.color = 'var(--text-muted)';
              e.currentTarget.style.backgroundColor = 'transparent';
            }}
          >
            <i className={`${icon} fa-lg`} aria-hidden="true" />
          </a>
        ))}
      </div>
      <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
        &copy; 2026 Desenvolvido por Danilson Sanches.
      </p>
    </footer>
  );
}
