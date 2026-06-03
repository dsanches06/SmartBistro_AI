import { useRef, useState, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router";
import { ThemeToggle } from "./ThemeToggle";
import { useTheme } from "../../context/ThemeContext";
import { useAuth } from "../../context/AuthContext";
import { getInitials, getPalette } from "../customers/CustomerCard";

const navLinks = [
  { to: "/dashboard",  label: "Dashboard",  exact: true },
  { to: "/table",      label: "Mesas" },
  { to: "/orders",     label: "Pedidos" },
  { to: "/kds",        label: "KDS" },
  { to: "/faturacao",  label: "Faturação" },
  { to: "/stock",      label: "Stock" },
  { to: "/clientes",   label: "Clientes" },
  { to: "/relatorios", label: "Relatórios" },
  { to: "/menu",       label: "Menu" },
];

function isActive(pathname, to, exact) {
  return exact ? pathname === to : pathname.startsWith(to);
}

function UserMenu({ user, onLogout }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const navigate = useNavigate();
  const palette = getPalette(user.id);

  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(o => !o)}
        className="flex items-center gap-2 rounded-xl px-2 py-1.5 transition-colors"
        style={{ background: open ? "var(--surface-2)" : "transparent" }}
        title={user.name}
      >
        <span
          className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
          style={{ background: palette.bg, color: palette.tx }}
        >
          {getInitials(user.name)}
        </span>
        <span className="hidden sm:block text-xs font-semibold max-w-[100px] truncate" style={{ color: "var(--text)" }}>
          {user.name.split(" ")[0]}
        </span>
        <i className={`fa-solid fa-chevron-${open ? "up" : "down"} text-[9px]`} style={{ color: "var(--text-muted)" }} />
      </button>

      {open && (
        <div
          className="absolute right-0 top-full mt-2 w-44 rounded-xl shadow-xl py-1 z-50"
          style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
        >
          <div className="px-3 py-2 border-b" style={{ borderColor: "var(--border)" }}>
            <p className="text-xs font-semibold truncate" style={{ color: "var(--text)" }}>{user.name}</p>
            <p className="text-[10px] truncate" style={{ color: "var(--text-muted)" }}>
              {user.username ? `@${user.username}` : user.email || ""}
            </p>
          </div>

          <button
            onClick={() => { setOpen(false); navigate(`/clientes?open=${user.id}`); }}
            className="w-full flex items-center gap-2 px-3 py-2 text-xs text-left transition-colors hover:bg-[var(--surface-2)]"
            style={{ color: "var(--text)" }}
          >
            <i className="fa-solid fa-user w-4 text-center" style={{ color: "var(--primary)" }} />
            Meu Perfil
          </button>

          <button
            onClick={() => { setOpen(false); onLogout(); navigate("/"); }}
            className="w-full flex items-center gap-2 px-3 py-2 text-xs text-left transition-colors hover:bg-[var(--surface-2)]"
            style={{ color: "#ef4444" }}
          >
            <i className="fa-solid fa-right-from-bracket w-4 text-center" />
            Sair
          </button>
        </div>
      )}
    </div>
  );
}

export function Header() {
  const { pathname } = useLocation();
  const { theme } = useTheme();
  const { user, logout } = useAuth();
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
          to="/dashboard"
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

        {/* Desktop nav — só para admin/manager */}
        {user?.role_id === 1 && (
          <nav className="hidden md:flex items-center gap-1" aria-label="Navegação principal">
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
        )}

        {/* Controls */}
        <div className="flex items-center gap-1 sm:gap-2">
          <ThemeToggle />
          {user && <UserMenu user={user} onLogout={logout} />}
        </div>
      </header>
    </>
  );
}
