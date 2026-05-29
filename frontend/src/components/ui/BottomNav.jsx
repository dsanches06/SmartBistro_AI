import { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router';
import { useTheme } from '../../context/ThemeContext';

const menuLinks = [
  { to: '/',            label: 'Dashboard',   icon: 'fa-solid fa-house',          exact: true },
  { to: '/table',       label: 'Mesas',       icon: 'fa-solid fa-chair'                      },
  { to: '/orders',      label: 'Pedidos',     icon: 'fa-solid fa-receipt'                    },
  { to: '/kds',         label: 'KDS',         icon: 'fa-solid fa-kitchen-set'                },
  { to: '/stock',       label: 'Stock',       icon: 'fa-solid fa-boxes-stacked'              },
  { to: '/faturacao',   label: 'Faturação',   icon: 'fa-solid fa-file-invoice-dollar'       },
  { to: '/relatorios',  label: 'Relatórios',  icon: 'fa-solid fa-chart-line'               },
  { to: '/clientes',    label: 'Clientes',    icon: 'fa-solid fa-users'                    },
  { to: '/configuracoes', label: 'Configurações', icon: 'fa-solid fa-gear'                 },
];

export const NAV_OPEN_H   = '15rem';
export const NAV_CLOSED_H = '0rem';
export const NAV_HANDLE_H = '3.25rem';

export function BottomNav({ onOpenChange }) {
  const { pathname }    = useLocation();
  const { theme }       = useTheme();
  const isDark          = theme === 'dark';
  const [open, setOpen] = useState(false);

  useEffect(() => {
    onOpenChange?.(open);
  }, [open, onOpenChange]);

  useEffect(() => {
    const mediaQuery = window.matchMedia('(max-width: 767.98px)');
    const handleChange = (event) => {
      if (event.matches) {
        setOpen(false);
      }
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  const bg     = isDark ? 'rgba(17,17,17,0.97)' : 'rgba(248,250,252,0.97)';
  const border = isDark ? '#2a2a2a'             : '#e2e8f0';

  return (
    <div className="md:hidden">
      {open ? (
        <div
          className="fixed bottom-0 left-0 right-0 z-40 flex flex-col overflow-visible transition-all duration-300"
          style={{
            height: NAV_OPEN_H,
            background: bg,
            backdropFilter: 'blur(12px)',
            WebkitBackdropFilter: 'blur(12px)',
            borderTop: `1px solid ${border}`,
            paddingBottom: 'calc(var(--safe-bottom) + 0.9rem)',
          }}
        >
          <div
            className="absolute top-0 left-1/2 z-10"
            style={{ top: 0, transform: 'translate(-50%, -50%)' }}
          >
            <button
              onClick={() => setOpen(false)}
              className="flex items-center gap-2 text-xs font-semibold px-4 py-2 rounded-full select-none whitespace-nowrap"
              style={{
                minWidth: '9rem',
                background: isDark ? '#11131b' : '#f8fafc',
                border: `1px solid ${isDark ? '#34364f' : '#cbd5e1'}`,
                color: isDark ? '#cbd5e1' : '#475569',
                boxShadow: '0 10px 25px rgba(0,0,0,0.18)',
                zIndex: 20,
              }}
              aria-label="Ocultar menu"
            >
              <i className="fa-solid fa-chevron-down text-[10px]" />
              Ocultar Menu
            </button>
          </div>

          <div className="grid grid-cols-3 gap-2 w-full px-3 pt-6 pb-2">
            {menuLinks.map(({ to, label, icon, exact }) => {
              const active = exact ? pathname === to : pathname.startsWith(to);
              return (
                <Link
                  key={to}
                  to={to}
                  className={[
                    "group flex flex-col items-center justify-center gap-1 rounded-xl py-3 text-[10px] font-semibold uppercase text-center select-none transition-colors duration-200",
                    active ? "text-[var(--primary)]" : "text-[var(--text-muted)] hover:text-[var(--primary)]",
                  ].join(" ")}
                  style={{
                    backgroundColor: 'transparent',
                    border: 'none',
                  }}
                  aria-current={active ? 'page' : undefined}
                >
                  <i className={`${icon} text-base transition-transform duration-200 group-hover:scale-110`} aria-hidden="true" />
                  <span className="leading-none">{label}</span>
                </Link>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="fixed inset-x-0 bottom-0 z-40 h-0 overflow-visible pointer-events-none"
             style={{ height: NAV_HANDLE_H, overflow: 'hidden' }}>
          <button
            onClick={() => setOpen(true)}
            className="absolute left-1/2 -translate-x-1/2 flex items-center gap-2 text-xs font-semibold px-4 py-2 rounded-full select-none whitespace-nowrap pointer-events-auto"
            style={{
              bottom: '0.5rem',
              minWidth: '9rem',
              background: isDark ? '#11131b' : '#f8fafc',
              border: `1px solid ${isDark ? '#34364f' : '#cbd5e1'}`,
              color: isDark ? '#cbd5e1' : '#475569',
              boxShadow: '0 10px 25px rgba(0,0,0,0.18)',
            }}
            aria-label="Mostrar menu"
          >
            <i className="fa-solid fa-chevron-up text-[10px]" />
            Mostrar Menu
          </button>
        </div>
      )}
    </div>
  );
}

