import { Link, useLocation } from "react-router";
import { ThemeToggle } from "./ThemeToggle";
import { NotificationButton } from "./NotificationButton.jsx";
import { useTheme } from "../../context/ThemeContext";

const navLinks = [
  { to: "/", label: "Dashboard", exact: true },
  { to: "/table", label: "Mesas" },
  { to: "/orders", label: "Pedidos" },
  { to: "/kds", label: "KDS" },
  { to: "/stock", label: "Stock" },
  { to: "/faturacao", label: "Faturação" },
  { to: "/relatorios", label: "Relatórios" },
  { to: "/clientes", label: "Clientes" },
  { to: "/menu", label: "Menu" },
];

function isActive(pathname, to, exact) {
  return exact ? pathname === to : pathname.startsWith(to);
}

export function Header() {
  const { pathname } = useLocation();
  const { theme } = useTheme();
  const isDark = theme === "dark";

  return (
    <>
      <header
        className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-4 sm:px-6 h-14 md:h-16 transition-colors"
        style={{
          background: isDark ? "rgba(13,13,13,0.88)" : "rgba(248,250,252,0.88)",
          backdropFilter: "blur(12px)",
          WebkitBackdropFilter: "blur(12px)",
          boxShadow: isDark
            ? "0 1px 0 rgba(255,255,255,0.06)"
            : "0 1px 0 rgba(0,0,0,0.08)",
        }}
        aria-label="Cabeçalho"
      >
        {/* Brand */}
        <Link
          to="/"
          className="flex flex-col leading-tight select-none flex-shrink-0"
          aria-label="Início — SmartBistro IA"
        >
          <span
            className="font-spartan text-lg sm:text-xl font-bold tracking-wide uppercase"
            style={{ color: "var(--text)" }}
          >
            SmartBistro<span style={{ color: "var(--primary)" }}>IA</span>
          </span>
          <span
            className="text-[10px] sm:text-[11px] hidden sm:block"
            style={{ color: "var(--text-muted)" }}
          >
            Sistema Inteligente para Restaurantes
          </span>
        </Link>

        {/* Desktop nav */}
        <nav
          className="hidden md:flex items-center gap-1"
          aria-label="Navegação principal"
        >
          {navLinks.map(({ to, label, exact }) => {
            const active = isActive(pathname, to, exact);
            return (
              <Link
                key={to}
                to={to}
                className={`nav-link px-3 py-1.5 rounded-md text-sm font-semibold uppercase tracking-widest${active ? " active" : ""}`}
                aria-current={active ? "page" : undefined}
              >
                {label}
              </Link>
            );
          })}
        </nav>

        {/* Controls */}
        <div className="flex items-center gap-1 sm:gap-2">
          <NotificationButton />
          <ThemeToggle />

          {/* Hamburger (mobile) */}
        </div>
      </header>
    </>
  );
}
