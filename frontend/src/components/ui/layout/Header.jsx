import { useRef, useState, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router";
import { ThemeToggle, PaymentModal } from "@/components/ui";
import { useTheme } from "@/context/ThemeContext";
import { useAuth } from "@/context/AuthContext";
import { getInitials, getPalette, formatDate } from "@/components/customers/CustomerCard.jsx";
import { customerService } from "@/services/customerService";
import { invoiceService } from "@/services/invoiceService";
import { paymentService } from "@/services/paymentService";
import { useClickOutside } from "@/components/ui/shared/useClickOutside.jsx";

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

  useClickOutside(ref, () => setOpen(false));

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
            onClick={() => { setOpen(false); navigate("/perfil"); }}
            className="w-full flex items-center gap-2 px-3 py-2 text-xs text-left transition-colors hover:bg-[var(--surface-2)]"
            style={{ color: "var(--text)" }}
          >
            <i className="fa-solid fa-user w-4 text-center" style={{ color: "var(--primary)" }} />
            Meu Perfil
          </button>
          <button
            onClick={() => { setOpen(false); navigate("/perfil/dashboard"); }}
            className="w-full flex items-center gap-2 px-3 py-2 text-xs text-left transition-colors hover:bg-[var(--surface-2)]"
            style={{ color: "var(--text)" }}
          >
            <i className="fa-solid fa-chart-line w-4 text-center" style={{ color: "var(--primary)" }} />
            Dashboard
          </button>
          <button
            onClick={() => { setOpen(false); navigate("/perfil/pedidos"); }}
            className="w-full flex items-center gap-2 px-3 py-2 text-xs text-left transition-colors hover:bg-[var(--surface-2)]"
            style={{ color: "var(--text)" }}
          >
            <i className="fa-solid fa-receipt w-4 text-center" style={{ color: "var(--primary)" }} />
            Meus Pedidos
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

const PAY_KEYWORDS = /pagamento|pagar|fatura|faturação|invoice|payment|valor/i;
const ORDER_ID_RE  = /#(\S+)/;

function NotificationBell({ user }) {
  const [open, setOpen]               = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [hiddenNotificationIds, setHiddenNotificationIds] = useState(new Set());
  const [paidNotificationIds, setPaidNotificationIds] = useState(new Set());
  const [loading, setLoading]         = useState(false);
  const [payInfo, setPayInfo]         = useState(null);
  const [payLoadingId, setPayLoadingId] = useState(null);
  const ref      = useRef(null);

  const unreadNotifications = notifications.filter(n => !n.is_read);
  const isPayNotification = (n) => PAY_KEYWORDS.test(`${n.title} ${n.message}`);
  const isPaidNotification = (n) => paidNotificationIds.has(n.id);
  const visibleNotifications = notifications.filter(
    n => !hiddenNotificationIds.has(n.id) && !isPaidNotification(n) && (!n.is_read || isPayNotification(n)),
  );
  const unreadCount = unreadNotifications.length;

  useClickOutside(ref, () => setOpen(false));

  const loadNotifs = async () => {
    if (!user?.id) return;
    setLoading(true);

    try {
      const list = await customerService.getNotifications(user.id);
      const items = Array.isArray(list) ? list : [];
      setNotifications(items);

      const paidIds = new Set();
      await Promise.all(items.filter(isPayNotification).map(async (n) => {
        const orderId = n.message?.match(ORDER_ID_RE)?.[1];
        if (!orderId) return;

        const inv = await invoiceService.getByOrder(orderId).catch(() => null);
        if (!inv?.id) return;

        const payments = await paymentService.getByInvoice(inv.id).catch(() => []);
        const alreadyPaid = Array.isArray(payments) && payments.some(p => p.payment_status === "Completed");
        if (alreadyPaid) paidIds.add(n.id);
      }));

      setPaidNotificationIds(paidIds);
    } catch {
      /* silent */
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadNotifs();
    const interval = setInterval(loadNotifs, 30000);
    return () => clearInterval(interval);
  }, [user?.id]);

  useEffect(() => { if (open) loadNotifs(); }, [open]);

  const handleMarkRead = async (n) => {
    if (n.is_read) return;
    try {
      await customerService.markNotificationRead(user.id, n.id);
      setNotifications(prev => prev.map(x => x.id === n.id ? { ...x, is_read: true } : x));
    } catch { /* silent */ }
  };

  const handlePayClick = async (e, n) => {
    e.stopPropagation();
    const orderId = n.message?.match(ORDER_ID_RE)?.[1];
    if (!orderId) return;
    setPayLoadingId(n.id);
    try {
      const inv = await invoiceService.getByOrder(orderId);
      if (!inv?.id) return;
      const payments = await paymentService.getByInvoice(inv.id).catch(() => []);
      const alreadyPaid = Array.isArray(payments) && payments.some(p => p.payment_status === "Completed");
      if (alreadyPaid) {
        await handleMarkRead(n);
        setHiddenNotificationIds((prev) => new Set(prev).add(n.id));
        return;
      }
      setOpen(false);
      setPayInfo({ unpaidInvoices: [{ orderId, inv }], notif: n });
    } catch { /* silent */ }
    finally { setPayLoadingId(null); }
  };

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(o => !o)}
        className="relative p-2 rounded-xl transition-colors hover:bg-[var(--surface-2)]"
        title="Notificações"
      >
        <i className="fa-solid fa-bell text-base" style={{ color: open ? "var(--primary)" : "var(--text-secondary)" }} />
        {unreadCount > 0 && (
          <span
            className="absolute flex items-center justify-center text-white font-bold"
            style={{
              top: "4px", right: "4px",
              minWidth: "15px", height: "15px",
              background: "#FF3B30",
              borderRadius: "50%",
              fontSize: "8px",
              border: "2px solid var(--bg)",
              lineHeight: 1,
              padding: "0 2px",
            }}
          >
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div
          className="fixed sm:absolute left-4 right-4 sm:left-auto sm:right-0 sm:w-80 top-[3.6rem] md:top-[4.1rem] sm:top-full sm:mt-2 z-[200] rounded-2xl shadow-2xl flex flex-col overflow-hidden"
          style={{
            maxHeight: "440px",
            background: "var(--surface)",
            border: "1px solid var(--border)",
          }}
        >
          {/* Header do dropdown */}
          <div className="flex items-center justify-between px-4 py-3 border-b flex-shrink-0" style={{ borderColor: "var(--border)" }}>
            <span className="text-sm font-bold" style={{ color: "var(--text)" }}>
              Notificações
            </span>
            <div className="flex items-center gap-2">
              {unreadCount > 0 && (
                <span className="text-[10px] px-2 py-0.5 rounded-full font-bold text-white" style={{ background: "#FF3B30" }}>
                  {unreadCount} {unreadCount === 1 ? "nova" : "novas"}
                </span>
              )}
              <span className="text-[10px] px-1.5 py-0.5 rounded-full" style={{ background: "var(--surface-2)", color: "var(--text-muted)" }}>
                {notifications.length}
              </span>
            </div>
          </div>

          {/* Lista */}
          <div className="overflow-y-auto flex-1">
            {loading && unreadNotifications.length === 0 ? (
              <p className="text-center py-6 text-xs" style={{ color: "var(--text-muted)" }}>A carregar...</p>
            ) : visibleNotifications.length === 0 ? (
              <div className="flex flex-col items-center gap-2 py-10">
                <i className="fa-regular fa-bell-slash text-2xl" style={{ color: "var(--text-muted)" }} />
                <p className="text-xs" style={{ color: "var(--text-muted)" }}>Sem notificações pendentes.</p>
              </div>
            ) : (
              visibleNotifications.map(n => {
                const isPayNotif = PAY_KEYWORDS.test(`${n.title} ${n.message}`);
                const isRead = !!n.is_read;
                return (
                  <div
                    key={n.id}
                    onClick={() => handleMarkRead(n)}
                    className="px-4 py-3 border-b last:border-0 cursor-pointer transition-colors hover:bg-[var(--surface-2)]"
                    style={{
                      borderBottom: "1px solid var(--border)",
                      borderLeft: "3px solid #E53535",
                      opacity: 1,
                    }}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="text-xs mb-0.5" style={{ color: "var(--text)", fontWeight: isRead ? 500 : 700 }}>
                          {n.title}
                        </p>
                        <p className="text-xs leading-relaxed" style={{ color: "var(--text-muted)" }}>{n.message}</p>
                        <p className="text-[10px] mt-1" style={{ color: "var(--text-muted)" }}>{formatDate(n.sent_at)}</p>
                      </div>
                      {isPayNotif && !isPaidNotification(n) && (
                        <button
                          onClick={(e) => handlePayClick(e, n)}
                          disabled={payLoadingId === n.id}
                          className="flex-shrink-0 px-2 py-1 rounded-lg text-[10px] font-bold text-white whitespace-nowrap disabled:opacity-60"
                          style={{ background: "#22c55e" }}
                        >
                          {payLoadingId === n.id ? "..." : "Pagar"}
                        </button>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {payInfo && (
        <PaymentModal
          onClose={() => setPayInfo(null)}
          unpaidInvoices={payInfo.unpaidInvoices}
          customerId={user?.id}
          onPaid={() => {
            handleMarkRead(payInfo.notif);
            setHiddenNotificationIds((prev) => new Set(prev).add(payInfo.notif.id));
            setPayInfo(null);
            loadNotifs();
          }}
        />
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
          {user?.role_id !== 1 && <NotificationBell user={user} />}
          {user && <UserMenu user={user} onLogout={logout} />}
        </div>
      </header>
    </>
  );
}
