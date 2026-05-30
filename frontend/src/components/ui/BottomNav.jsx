import { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router';
import { useTheme } from '../../context/ThemeContext';

const menuLinks = [
  { to: '/',              label: 'Dashboard',    icon: 'fa-solid fa-house',               exact: true },
  { to: '/table',         label: 'Mesas',        icon: 'fa-solid fa-chair'                            },
  { to: '/orders',        label: 'Pedidos',      icon: 'fa-solid fa-receipt'                          },
  { to: '/kds',           label: 'KDS',          icon: 'fa-solid fa-kitchen-set'                      },
  { to: '/stock',         label: 'Stock',        icon: 'fa-solid fa-boxes-stacked'                    },
  { to: '/faturacao',     label: 'Faturação',    icon: 'fa-solid fa-file-invoice-dollar'              },
  { to: '/relatorios',    label: 'Relatórios',   icon: 'fa-solid fa-chart-line'                       },
  { to: '/clientes',      label: 'Clientes',     icon: 'fa-solid fa-users'                            },
  { to: '/menu',          label: 'Menu',          icon: 'fa-solid fa-utensils'                         },
];

export const NAV_OPEN_H   = '15rem';
export const NAV_CLOSED_H = '0rem';
export const NAV_HANDLE_H = '2rem'; // altura visível do tab quando fechado

export function BottomNav({ onOpenChange }) {
  const { pathname }    = useLocation();
  const { theme }       = useTheme();
  const isDark          = theme === 'dark';
  const [open, setOpen] = useState(false);

  useEffect(() => { onOpenChange?.(open); }, [open, onOpenChange]);

  useEffect(() => {
    const mq = window.matchMedia('(max-width: 767.98px)');
    const handler = (e) => { if (e.matches) setOpen(false); };
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  const bg     = isDark ? 'rgba(17,17,17,0.97)' : 'rgba(248,250,252,0.97)';
  const border = isDark ? '#2a2a2a' : '#e2e8f0';

  /* ── Botão tab (meia lua) ── */
  const Tab = ({ onClick, icon, label }) => (
    <button
      onClick={onClick}
      className="flex items-center gap-2 select-none whitespace-nowrap pointer-events-auto"
      style={{
        background: bg,
        border: `1px solid ${border}`,
        borderBottom: 'none',
        borderRadius: '20px 20px 0 0',
        padding: '10px 28px 11px',
        boxShadow: '0 -4px 14px rgba(0,0,0,0.13)',
        cursor: 'pointer',
      }}
    >
      <span
        className="flex items-center justify-center w-6 h-6 rounded-lg flex-shrink-0"
        style={{ background: isDark ? '#2a2a2a' : '#e2e8f0' }}
      >
        <i className={`fa-solid ${icon} text-[10px] text-[var(--primary)]`} />
      </span>
      <span className="text-xs font-bold uppercase tracking-widest text-[var(--text-secondary)]">
        {label}
      </span>
    </button>
  );

  return (
    <div className="md:hidden">
      {/* ── Overlay — fecha ao clicar fora do nav ── */}
      {open && (
        <div
          className="fixed inset-0 z-30"
          onClick={() => setOpen(false)}
        />
      )}

      {/* ── Nav aberto ── */}
      {open && (
        <div
          className="fixed bottom-0 left-0 right-0 z-40 flex flex-col"
          style={{
            height: NAV_OPEN_H,
            background: bg,
            backdropFilter: 'blur(12px)',
            WebkitBackdropFilter: 'blur(12px)',
            borderTop: `1px solid ${border}`,
            paddingBottom: 'calc(var(--safe-bottom) + 0.9rem)',
          }}
        >
          {/* Tab "Ocultar" flutuando acima da borda do nav */}
          <div
            className="absolute left-1/2 z-10"
            style={{ top: 0, transform: 'translate(-50%, -100%)' }}
          >
            <Tab onClick={() => setOpen(false)} icon="fa-chevron-down" label="Esconder Menu" />
          </div>

          <div className="grid grid-cols-3 gap-2 w-full px-3 pt-4 pb-2">
            {menuLinks.map(({ to, label, icon, exact }) => {
              const active = exact ? pathname === to : pathname.startsWith(to);
              return (
                <Link
                  key={to}
                  to={to}
                  className={[
                    'group flex flex-col items-center justify-center gap-1 rounded-xl py-3 text-[10px] font-semibold uppercase text-center select-none transition-colors duration-200',
                    active ? 'text-[var(--primary)]' : 'text-[var(--text-muted)] hover:text-[var(--primary)]',
                  ].join(' ')}
                  aria-current={active ? 'page' : undefined}
                >
                  <i className={`${icon} text-base transition-transform duration-200 group-hover:scale-110`} aria-hidden="true" />
                  <span className="leading-none">{label}</span>
                </Link>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Tab "Mostrar" — só a parte de cima visível ── */}
      {!open && (
        <div
          className="fixed inset-x-0 bottom-0 z-40 flex justify-center pointer-events-none"
          style={{ height: 0 }}
        >
          <div style={{ position: 'absolute', bottom: 8, pointerEvents: 'auto' }}>
            <Tab onClick={() => setOpen(true)} icon="fa-chevron-up" label="Mostrar Menu" />
          </div>
        </div>
      )}
    </div>
  );
}
