import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "react-router";
import { itemService } from "@/services";
import { orderService }     from "@/services/orderService";
import { orderItemService } from "@/services/orderItemService";
import { MENU_CATEGORIES, MENU_CATEGORY_META, formatMenuPrice, getItemEmoji, ALL_KEY } from "@/utils";
import { useTheme } from "@/context/ThemeContext";
import { useAuth } from "@/context/AuthContext";
import { ThemeToggle } from "@/components/ui";

/* ── Icons ── */
function IconLogin() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
      <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" />
      <polyline points="10 17 15 12 10 7" />
      <line x1="15" y1="12" x2="3" y2="12" />
    </svg>
  );
}

function IconRegister() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <line x1="19" y1="8" x2="19" y2="14" />
      <line x1="22" y1="11" x2="16" y2="11" />
    </svg>
  );
}

function IconClose() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );
}

/* ── Modal base ── */
function Modal({ open, onClose, title, children, isDark, size = "lg" }) {
  const overlayRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    const handleKey = (e) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-[100] flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)" }}
      onClick={(e) => { if (e.target === overlayRef.current) onClose(); }}
    >
      <div
        className={`w-full ${size === "xs" ? "max-w-xs" : size === "sm" ? "max-w-sm" : size === "md" ? "max-w-md" : "max-w-lg"} rounded-2xl p-6 shadow-2xl`}
        style={{
          background: "var(--surface)",
          border: "1px solid var(--border)",
        }}
      >
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-bold" style={{ color: "var(--text)" }}>{title}</h2>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg transition-colors hover:bg-[var(--surface-2)]"
            style={{ color: "var(--text-muted)" }}
          >
            <IconClose />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

/* ── Campo de formulário ── */
function Field({ label, type = "text", value, onChange, placeholder, autoFocus }) {
  const [show, setShow] = useState(type === "password");
  const isPassword = type === "password";
  const inputType  = isPassword ? (show ? "text" : "password") : type;

  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>
        {label}
      </label>
      <div className="relative">
        <input
          type={inputType}
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder={placeholder}
          autoFocus={autoFocus}
          className="w-full h-8 rounded-lg px-3 text-sm outline-none transition-all"
          style={{
            background: "var(--surface-2)",
            border: "1.5px solid var(--border)",
            color: "var(--text)",
            paddingRight: isPassword ? "2.75rem" : undefined,
          }}
          onFocus={e => e.target.style.borderColor = "var(--primary)"}
          onBlur={e => e.target.style.borderColor = "var(--border)"}
        />
        {isPassword && (
          <button
            type="button"
            onClick={() => setShow(s => !s)}
            className="absolute right-3 top-1/2 -translate-y-1/2"
            style={{ color: "var(--text-muted)" }}
            tabIndex={-1}
            aria-label={show ? "Ocultar password" : "Mostrar password"}
          >
            {show ? (
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
                <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
                <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
                <line x1="1" y1="1" x2="23" y2="23" />
              </svg>
            ) : (
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                <circle cx="12" cy="12" r="3" />
              </svg>
            )}
          </button>
        )}
      </div>
    </div>
  );
}

/* ── Mensagem de erro ── */
function ErrorMsg({ msg }) {
  if (!msg) return null;
  return (
    <p className="text-xs px-3 py-2 rounded-lg" style={{ background: "rgba(239,68,68,0.1)", color: "#ef4444" }}>
      {msg}
    </p>
  );
}

/* ── Modal Login ── */
function LoginModal({ open, onClose, onSwitchToRegister, isDark, onLogin }) {
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword]     = useState("");
  const [loading, setLoading]       = useState(false);
  const [error, setError]           = useState("");

  const canSubmit = identifier.trim().length > 0 && password.length > 0;

  const handleClose = () => { setIdentifier(""); setPassword(""); setError(""); onClose(); };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!canSubmit) return;
    setError("");
    setLoading(true);
    try {
      await onLogin(identifier, password);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal open={open} onClose={handleClose} title="Entrar na conta" isDark={isDark} size="xs">
      <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
        <Field label="E-mail ou username" value={identifier} onChange={setIdentifier} placeholder="email ou username" autoFocus />
        <Field label="Palavra-passe" type="password" value={password} onChange={setPassword} placeholder="••••••••" />
        <ErrorMsg msg={error} />

        <button
          type="submit"
          disabled={!canSubmit || loading}
          className="w-full py-2 rounded-xl text-sm font-semibold transition-all"
          style={{
            background: canSubmit ? "var(--primary)" : "transparent",
            color: canSubmit ? "#fff" : "var(--text-muted)",
            border: canSubmit ? "1.5px solid var(--primary)" : "1.5px solid var(--border)",
            cursor: canSubmit ? "pointer" : "not-allowed",
          }}
        >
          {loading ? "A entrar..." : "Entrar"}
        </button>

        <p className="text-center text-xs" style={{ color: "var(--text-muted)" }}>
          Não tens conta?{" "}
          <button
            type="button"
            className="font-semibold underline underline-offset-2"
            style={{ color: "var(--primary)" }}
            onClick={() => { handleClose(); onSwitchToRegister(); }}
          >
            Registar
          </button>
        </p>
      </form>
    </Modal>
  );
}

/* ── Modal Registo ── */
function RegisterModal({ open, onClose, onSwitchToLogin, isDark, onRegister }) {
  const [name, setName]         = useState("");
  const [username, setUsername] = useState("");
  const [email, setEmail]       = useState("");
  const [phone, setPhone]       = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm]   = useState("");
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState("");

  const passwordsMatch = password.length > 0 && password === confirm;
  const canSubmit = name.trim().length > 0 && username.trim().length > 0 && passwordsMatch;

  const handleClose = () => {
    setName(""); setUsername(""); setEmail(""); setPhone("");
    setPassword(""); setConfirm(""); setError(""); onClose();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!canSubmit) return;
    setError("");
    if (password !== confirm) { setError("As palavras-passe não coincidem."); return; }
    setLoading(true);
    try {
      await onRegister(name, username, email, phone, password);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal open={open} onClose={handleClose} title="Criar conta" isDark={isDark}>
      <form className="flex flex-col gap-3" onSubmit={handleSubmit}>
        {/* Row 1 */}
        <div className="grid grid-cols-2 gap-3">
          <Field label="Nome completo *" value={name} onChange={setName} placeholder="O teu nome" autoFocus />
          <Field label="Username *" value={username} onChange={setUsername} placeholder="username" />
        </div>
        {/* Row 2 */}
        <div className="grid grid-cols-2 gap-3">
          <Field label="E-mail" type="email" value={email} onChange={setEmail} placeholder="email (opcional)" />
          <Field label="Telefone" value={phone} onChange={setPhone} placeholder="telefone (opcional)" />
        </div>
        {/* Row 3 */}
        <div className="grid grid-cols-2 gap-3">
          <Field label="Palavra-passe *" type="password" value={password} onChange={setPassword} placeholder="••••••••" />
          <div className="flex flex-col gap-1.5">
            <Field label="Confirmar *" type="password" value={confirm} onChange={setConfirm} placeholder="••••••••" />
            {confirm.length > 0 && (
              <p className="text-[10px]" style={{ color: passwordsMatch ? "#22c55e" : "#ef4444" }}>
                {passwordsMatch ? "✓ Coincidem" : "✗ Não coincidem"}
              </p>
            )}
          </div>
        </div>
        <ErrorMsg msg={error} />

        <button
          type="submit"
          disabled={!canSubmit || loading}
          className="w-full py-2 rounded-xl text-sm font-semibold transition-all"
          style={{
            background: canSubmit ? "var(--primary)" : "transparent",
            color: canSubmit ? "#fff" : "var(--text-muted)",
            border: canSubmit ? "1.5px solid var(--primary)" : "1.5px solid var(--border)",
            cursor: canSubmit ? "pointer" : "not-allowed",
          }}
        >
          {loading ? "A criar conta..." : "Criar conta"}
        </button>

        <p className="text-center text-xs" style={{ color: "var(--text-muted)" }}>
          Já tens conta?{" "}
          <button
            type="button"
            className="font-semibold underline underline-offset-2"
            style={{ color: "var(--primary)" }}
            onClick={() => { handleClose(); onSwitchToLogin(); }}
          >
            Entrar
          </button>
        </p>
      </form>
    </Modal>
  );
}

/* ── NavTab (tab show/hide do BottomNav) ── */
function NavTab({ onClick, open = false, isDark }) {
  const bg     = isDark ? "rgba(28,28,30,0.97)"  : "rgba(208,214,220,0.97)";
  const border = isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.12)";
  const iconBg = isDark ? "#3a3a3c" : "#b8c0c8";
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-2 select-none whitespace-nowrap"
      style={{
        background: bg,
        borderTop: `1px solid ${border}`,
        borderLeft: `1px solid ${border}`,
        borderRight: `1px solid ${border}`,
        borderBottom: "none",
        borderRadius: "20px 20px 0 0",
        padding: "10px 28px 11px",
        boxShadow: "0 -4px 14px rgba(0,0,0,0.13)",
        cursor: "pointer",
      }}
    >
      <span
        className="flex items-center justify-center w-6 h-6 rounded-lg flex-shrink-0"
        style={{ background: iconBg }}
      >
        <i className={`fa-solid fa-chevron-${open ? "down" : "up"} text-[10px]`} style={{ color: "var(--primary)" }} />
      </span>
      <span className="text-xs font-bold uppercase tracking-widest" style={{ color: "var(--text-secondary)" }}>
        {open ? "Ocultar Menu" : "Mostrar Menu"}
      </span>
    </button>
  );
}

/* ══════════════════════════════════════════
   MainPage
══════════════════════════════════════════ */
export default function MainPage() {
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const { user, login, register, logout } = useAuth();
  const navigate = useNavigate();

  const [items, setItems]               = useState([]);
  const [loading, setLoading]           = useState(true);
  const [activeCategory, setActiveCategory] = useState(ALL_KEY);
  const [showLogin, setShowLogin]       = useState(false);
  const [showRegister, setShowRegister] = useState(false);
  const [showRegisterSuccess, setShowRegisterSuccess] = useState(false);
  const [navOpen, setNavOpen]           = useState(false);
  const [cart, setCart]                 = useState({});
  const [showCart, setShowCart]         = useState(false);
  const [orderLoading, setOrderLoading] = useState(false);
  const [orderSuccess, setOrderSuccess] = useState(false);

  const isClient  = user && user.role_id !== 1;
  const cartItems = useMemo(() => Object.values(cart).filter(c => c.qty > 0), [cart]);
  const cartTotal = useMemo(() => cartItems.reduce((s, c) => s + Number(c.item.price) * c.qty, 0), [cartItems]);
  const cartCount = useMemo(() => cartItems.reduce((s, c) => s + c.qty, 0), [cartItems]);

  const addToCart = (item) =>
    setCart(prev => ({ ...prev, [item.id]: { item, qty: (prev[item.id]?.qty || 0) + 1 } }));

  const removeFromCart = (itemId) =>
    setCart(prev => {
      const qty = (prev[itemId]?.qty || 0) - 1;
      if (qty <= 0) { const next = { ...prev }; delete next[itemId]; return next; }
      return { ...prev, [itemId]: { ...prev[itemId], qty } };
    });

  const handleSubmitOrder = async () => {
    if (!cartItems.length) return;
    setOrderLoading(true);
    try {
      // 1. Criar o pedido
      const order = await orderService.create({
        customer_id: user.id,
        service_type: "Takeaway",
        kitchen_sequence_json: JSON.stringify(cartItems.map(c => ({
          name: c.item.name,
          quantity: c.qty,
          price: Number(c.item.price),
        }))),
        order_status: "In Preparation",
      });

      // 2. Guardar os order_items na DB (permite cálculos financeiros e Chef AI)
      if (order?.id) {
        await orderItemService.createBulk({
          order_id: order.id,
          items:    cartItems.map(c => ({ item_id: c.item.id, quantity: c.qty })),
        }).catch(() => { /* silent — order já foi criado */ });
      }

      setCart({});
      setShowCart(false);
      setOrderSuccess(true);
      setTimeout(() => setOrderSuccess(false), 4000);
    } catch { /* silent */ }
    finally { setOrderLoading(false); }
  };

  useEffect(() => {
    itemService.getActive()
      .then(setItems)
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
  }, []);

  const handleLogin = async (identifier, password) => {
    const u = await login(identifier, password);
    setShowLogin(false);
    navigate(u.role_id === 1 ? "/dashboard" : "/", { replace: true });
  };

  const handleRegister = async (name, username, email, phone, password) => {
    await register(name, username, email, phone, password);
    setShowRegister(false);
    setShowRegisterSuccess(true);
  };

  const groupedAll = useMemo(() =>
    MENU_CATEGORIES.map(cat => ({
      ...cat,
      items: items.filter(i => i.category === cat.key),
    })).filter(g => g.items.length > 0),
    [items]
  );

  const filteredItems = useMemo(() =>
    items.filter(i => i.category === activeCategory),
    [items, activeCategory]
  );

  const headerBtnStyle = {
    color: "var(--text-secondary)",
    border: "1.5px solid var(--border)",
    background: "var(--surface)",
  };

  return (
    <div style={{ minHeight: "100dvh", background: "var(--bg)", color: "var(--text)", overflowX: "hidden" }}>
      {/* Header */}
      <header
        className="sticky top-0 z-50 flex items-center justify-between px-4 sm:px-8 h-14 md:h-16"
        style={{
          background: isDark ? "rgba(13,13,13,0.9)" : "rgba(248,250,252,0.9)",
          backdropFilter: "blur(12px)",
          WebkitBackdropFilter: "blur(12px)",
          boxShadow: isDark ? "0 1px 0 rgba(255,255,255,0.06)" : "0 1px 0 rgba(0,0,0,0.08)",
        }}
      >
        <Link to="/" className="flex flex-col leading-tight select-none">
          <span
            className="font-spartan text-lg sm:text-xl font-bold tracking-wide uppercase"
            style={{ color: "var(--text)" }}
          >
            SmartBistro<span style={{ color: "var(--primary)" }}>IA</span>
          </span>
          <span className="text-[10px] sm:text-[11px] hidden sm:block" style={{ color: "var(--text-muted)" }}>
            Cardápio Digital
          </span>
        </Link>

        {/* Controls */}
        <div className="flex items-center gap-2">
          {user ? (
            <Link
              to="/perfil"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all"
              style={{ background: "var(--primary)", color: "#fff", border: "1.5px solid var(--primary)" }}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                <circle cx="12" cy="7" r="4" />
              </svg>
              <span className="hidden sm:inline">{user.name.split(" ")[0]}</span>
            </Link>
          ) : (
            <>
              <button
                onClick={() => setShowLogin(true)}
                title="Entrar"
                className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all hover:border-[var(--primary)] hover:text-[var(--primary)]"
                style={headerBtnStyle}
              >
                <IconLogin />
                <span>Entrar</span>
              </button>

              <button
                onClick={() => setShowRegister(true)}
                title="Registar"
                className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all"
                style={{ background: "var(--primary)", color: "#fff", border: "1.5px solid var(--primary)" }}
              >
                <IconRegister />
                <span>Registar</span>
              </button>
            </>
          )}

          <ThemeToggle />
        </div>
      </header>

      {/* Hero */}
      <div className="text-center px-4 py-10 sm:py-14">
        <h1 className="text-3xl sm:text-4xl font-bold mb-2" style={{ color: "var(--text)" }}>
          Cardápio
        </h1>
        <p className="text-sm sm:text-base" style={{ color: "var(--text-muted)" }}>
          Descubra os nossos pratos, bebidas e muito mais
        </p>
      </div>

      {/* Category Tabs */}
      <div className="flex items-center justify-between sm:justify-center gap-2 px-4 sm:px-8 pb-3 pt-2 max-w-5xl mx-auto">
        <button
          onClick={() => setActiveCategory(ALL_KEY)}
          className="relative flex-1 sm:flex-shrink-0 sm:flex-initial px-2 sm:px-4 py-2 rounded-full text-xs sm:text-sm font-semibold transition-all text-center"
          style={{
            background: activeCategory === ALL_KEY ? "var(--primary)" : "var(--surface-2)",
            color: activeCategory === ALL_KEY ? "#fff" : "var(--text-secondary)",
          }}
        >
          Todos
          {items.length > 0 && (
            <span className="sm:hidden absolute -top-1.5 -right-1 w-4 h-4 flex items-center justify-center rounded-full text-[9px] font-bold"
              style={{ background: activeCategory === ALL_KEY ? "rgba(255,255,255,0.9)" : "var(--primary)", color: activeCategory === ALL_KEY ? "var(--primary)" : "#fff" }}>
              {items.length}
            </span>
          )}
        </button>
        {MENU_CATEGORIES.map(cat => {
          const count = items.filter(i => i.category === cat.key).length;
          const active = activeCategory === cat.key;
          return (
            <button
              key={cat.key}
              onClick={() => setActiveCategory(cat.key)}
              className="relative flex-1 sm:flex-shrink-0 sm:flex-initial flex items-center justify-center gap-1 sm:gap-1.5 px-2 sm:px-4 py-2 rounded-full text-xs sm:text-sm font-semibold transition-all"
              style={{
                background: active ? cat.accent : "var(--surface-2)",
                color: active ? "#fff" : "var(--text-secondary)",
              }}
            >
              <span>{cat.emoji}</span>
              <span className="hidden sm:inline">{cat.label}</span>
              {count > 0 && (
                <span className="sm:hidden absolute -top-1.5 -right-1 w-4 h-4 flex items-center justify-center rounded-full text-[9px] font-bold"
                  style={{ background: active ? "rgba(255,255,255,0.9)" : cat.accent, color: active ? cat.accent : "#fff" }}>
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Content */}
      <main className="px-4 sm:px-8 py-6 max-w-5xl mx-auto pb-40 sm:pb-12">
        {/* Banner sucesso */}
        {orderSuccess && (
          <div className="mb-4 flex items-center gap-2 px-4 py-3 rounded-2xl text-sm font-semibold"
            style={{ background: "rgba(34,197,94,0.12)", border: "1px solid rgba(34,197,94,0.3)", color: "#22c55e" }}>
            <i className="fa-solid fa-circle-check" />
            Pedido enviado com sucesso! Aguarda a confirmação.
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <span style={{ color: "var(--text-muted)" }}>A carregar cardápio...</span>
          </div>
        ) : activeCategory === ALL_KEY ? (
          <div className="space-y-10">
            {groupedAll.length === 0 ? (
              <p className="text-center py-10" style={{ color: "var(--text-muted)" }}>
                Sem itens disponíveis.
              </p>
            ) : (
              groupedAll.map(({ key, label, emoji, accent, bg, bgDark, items: catItems }) => (
                <section key={key}>
                  <div className="flex items-center gap-2 mb-4">
                    <span className="text-xl">{emoji}</span>
                    <h2 className="text-xl font-bold" style={{ color: "var(--text)" }}>{label}</h2>
                    <span
                      className="ml-auto text-xs px-2.5 py-0.5 rounded-full font-semibold"
                      style={{ background: isDark ? bgDark : bg, color: accent }}
                    >
                      {catItems.length} item{catItems.length !== 1 ? "s" : ""}
                    </span>
                  </div>
                  <ItemGrid items={catItems} isDark={isDark} isClient={isClient} cart={cart} onAdd={addToCart} onRemove={removeFromCart} />
                </section>
              ))
            )}
          </div>
        ) : (
          <ItemGrid items={filteredItems} isDark={isDark} isClient={isClient} cart={cart} onAdd={addToCart} onRemove={removeFromCart} />
        )}
      </main>

      {/* Botão carrinho flutuante — igual ao estilo do chat */}
      {isClient && cartCount > 0 && (
        <button
          onClick={() => setShowCart(true)}
          aria-label="Ver pedido"
          className="fixed right-4 z-[49] w-12 h-12 sm:w-14 sm:h-14 rounded-full text-white flex items-center justify-center shadow-2xl transition-all hover:scale-105 active:scale-95"
          style={{
            bottom: "5rem",
            background: "var(--primary)",
            boxShadow: "0 4px 20px rgba(99,102,241,0.5)",
          }}
        >
          <i className="fa-solid fa-basket-shopping text-lg sm:text-xl" />
          <span
            className="absolute -top-1 -right-1 flex items-center justify-center rounded-full text-white font-bold"
            style={{
              minWidth: "20px", height: "20px",
              background: "#FF3B30",
              fontSize: "10px",
              border: "2px solid var(--bg)",
              padding: "0 3px",
            }}
          >
            {cartCount > 9 ? "9+" : cartCount}
          </span>
        </button>
      )}

      {/* Modal carrinho */}
      {showCart && (
        <div
          className="fixed inset-0 z-[110] flex items-end sm:items-center justify-center p-0 sm:p-4"
          style={{ background: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)" }}
          onClick={(e) => { if (e.target === e.currentTarget) setShowCart(false); }}
        >
          <div
            className="w-full sm:max-w-md flex flex-col rounded-t-3xl sm:rounded-2xl"
            style={{ background: "var(--surface)", border: "1px solid var(--border)", maxHeight: "88dvh" }}
          >
            {/* Header fixo */}
            <div className="flex items-center justify-between px-5 py-4 border-b flex-shrink-0" style={{ borderColor: "var(--border)" }}>
              <h2 className="text-base font-bold" style={{ color: "var(--text)" }}>
                <i className="fa-solid fa-basket-shopping mr-2" style={{ color: "var(--primary)" }} />
                O meu pedido
                <span className="ml-2 text-xs font-normal px-1.5 py-0.5 rounded-full" style={{ background: "var(--surface-2)", color: "var(--text-muted)" }}>
                  {cartCount} {cartCount === 1 ? "item" : "itens"}
                </span>
              </h2>
              <button onClick={() => setShowCart(false)} className="p-1.5 rounded-lg" style={{ color: "var(--text-muted)" }}>
                <i className="fa-solid fa-xmark" />
              </button>
            </div>

            {/* Lista de itens — scroll aqui */}
            <div className="overflow-y-auto flex-1">
              {cartItems.map(({ item, qty }) => (
                <div key={item.id} className="flex items-center gap-3 px-5 py-3.5 border-b" style={{ borderColor: "var(--border)" }}>
                  <span className="text-xl flex-shrink-0">{getItemEmoji(item.name)}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold truncate" style={{ color: "var(--text)" }}>{item.name}</p>
                    <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>
                      {formatMenuPrice(item.price)} × {qty} = <span style={{ color: "var(--primary)", fontWeight: 600 }}>{formatMenuPrice(Number(item.price) * qty)}</span>
                    </p>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <button onClick={() => removeFromCart(item.id)}
                      className="w-7 h-7 rounded-full flex items-center justify-center text-sm font-bold"
                      style={{ background: "var(--surface-2)", color: "var(--text)" }}>−</button>
                    <span className="text-sm font-bold w-5 text-center" style={{ color: "var(--text)" }}>{qty}</span>
                    <button onClick={() => addToCart(item)}
                      className="w-7 h-7 rounded-full flex items-center justify-center text-sm font-bold"
                      style={{ background: "var(--primary)", color: "#fff" }}>+</button>
                  </div>
                </div>
              ))}
            </div>

            {/* Footer fixo — sempre visível */}
            <div
              className="px-5 pt-4 pb-5 space-y-3 border-t flex-shrink-0"
              style={{ borderColor: "var(--border)", paddingBottom: "calc(1.25rem + env(safe-area-inset-bottom, 0px))" }}
            >
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold" style={{ color: "var(--text-muted)" }}>Total</span>
                <span className="text-xl font-bold" style={{ color: "var(--primary)" }}>{formatMenuPrice(cartTotal)}</span>
              </div>
              <p className="text-xs flex items-center gap-1.5" style={{ color: "var(--text-muted)" }}>
                <i className="fa-solid fa-bag-shopping" />
                Takeaway — preparado assim que confirmado.
              </p>
              <button
                onClick={handleSubmitOrder}
                disabled={orderLoading}
                className="w-full py-3.5 rounded-2xl text-sm font-bold text-white disabled:opacity-60 transition-opacity"
                style={{ background: "var(--primary)" }}
              >
                {orderLoading ? "A enviar pedido..." : "Confirmar pedido"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modais */}
      <LoginModal
        open={showLogin}
        onClose={() => setShowLogin(false)}
        onSwitchToRegister={() => setShowRegister(true)}
        isDark={isDark}
        onLogin={handleLogin}
      />
      <RegisterModal
        open={showRegister}
        onClose={() => setShowRegister(false)}
        onSwitchToLogin={() => setShowLogin(true)}
        isDark={isDark}
        onRegister={handleRegister}
      />

      {/* Modal sucesso registo */}
      <Modal
        open={showRegisterSuccess}
        onClose={() => setShowRegisterSuccess(false)}
        title="Conta criada"
        isDark={isDark}
        size="xs"
      >
        <div className="flex flex-col items-center gap-4 text-center py-2">
          <div className="w-14 h-14 rounded-full flex items-center justify-center" style={{ background: "rgba(34,197,94,0.12)" }}>
            <i className="fa-solid fa-circle-check text-3xl" style={{ color: "#22c55e" }} />
          </div>
          <p className="text-sm" style={{ color: "var(--text)" }}>
            A tua conta foi criada com sucesso!<br />Inicia sessão para continuares.
          </p>
          <button
            onClick={() => { setShowRegisterSuccess(false); setShowLogin(true); }}
            className="w-full py-2 rounded-xl text-sm font-semibold text-white transition-all"
            style={{ background: "var(--primary)", border: "1.5px solid var(--primary)" }}
          >
            Iniciar sessão
          </button>
        </div>
      </Modal>

      {/* BottomNav mobile — show/hide */}
      <div className="sm:hidden">
        {navOpen && (
          <div className="fixed inset-0 z-40" onClick={() => setNavOpen(false)} />
        )}

        {navOpen && (
          <nav
            className="fixed bottom-0 left-0 right-0 z-50 flex items-center justify-around px-8"
            style={{
              height: "5rem",
              background: isDark ? "rgba(28,28,30,0.97)" : "rgba(208,214,220,0.97)",
              backdropFilter: "blur(12px)",
              WebkitBackdropFilter: "blur(12px)",
              borderTop: `1px solid ${isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.12)"}`,
              boxShadow: "0 -4px 20px rgba(0,0,0,0.2)",
            }}
          >
            <div
              className="absolute left-1/2 z-10"
              style={{ top: 0, transform: "translate(-50%, -100%)" }}
            >
              <NavTab open onClick={() => setNavOpen(false)} isDark={isDark} />
            </div>

            {user ? (
              <>
                <Link
                  to="/perfil"
                  onClick={() => setNavOpen(false)}
                  className="flex flex-col items-center gap-1"
                >
                  <i className="fa-solid fa-user text-xl" style={{ color: "var(--primary)" }} />
                  <span className="text-[11px] font-semibold" style={{ color: "var(--text)" }}>Meu Perfil</span>
                </Link>
                <button
                  onClick={() => { setNavOpen(false); logout(); navigate("/"); }}
                  className="flex flex-col items-center gap-1"
                >
                  <i className="fa-solid fa-right-from-bracket text-xl" style={{ color: "#ef4444" }} />
                  <span className="text-[11px] font-semibold" style={{ color: "#ef4444" }}>Sair</span>
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={() => { setNavOpen(false); setShowLogin(true); }}
                  className="flex flex-col items-center gap-1"
                >
                  <i className="fa-solid fa-right-to-bracket text-xl" style={{ color: "var(--text-secondary)" }} />
                  <span className="text-[11px] font-semibold" style={{ color: "var(--text)" }}>Entrar</span>
                </button>
                <button
                  onClick={() => { setNavOpen(false); setShowRegister(true); }}
                  className="flex flex-col items-center gap-1"
                >
                  <i className="fa-solid fa-user-plus text-xl" style={{ color: "var(--text-secondary)" }} />
                  <span className="text-[11px] font-semibold" style={{ color: "var(--text)" }}>Registar</span>
                </button>
              </>
            )}
          </nav>
        )}

        {!navOpen && (
          <div
            className="fixed inset-x-0 bottom-0 z-50 flex justify-center pointer-events-none"
            style={{ height: 0 }}
          >
            <div style={{ position: "absolute", bottom: 8, pointerEvents: "auto" }}>
              <NavTab onClick={() => setNavOpen(true)} isDark={isDark} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/* ── ItemGrid ── */
function ItemGrid({ items, isDark, isClient, cart, onAdd, onRemove }) {
  if (!items.length) {
    return (
      <div className="text-center py-10" style={{ color: "var(--text-muted)" }}>
        Sem itens disponíveis nesta categoria.
      </div>
    );
  }
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {items.map(item => (
        <ItemCard
          key={item.id}
          item={item}
          isDark={isDark}
          qty={cart?.[item.id]?.qty || 0}
          isClient={isClient}
          onAdd={() => onAdd?.(item)}
          onRemove={() => onRemove?.(item.id)}
        />
      ))}
    </div>
  );
}

/* ── ItemCard ── */
function ItemCard({ item, isDark, qty, isClient, onAdd, onRemove }) {
  const meta = MENU_CATEGORY_META[item.category] ?? {};
  return (
    <div
      className="flex flex-col rounded-2xl p-4 transition-transform hover:scale-[1.02] gap-3"
      style={{
        background: "var(--surface)",
        border: qty > 0 ? `1.5px solid var(--primary)` : "1px solid var(--border)",
        boxShadow: qty > 0 ? "0 2px 12px rgba(99,102,241,0.15)" : "0 2px 8px rgba(0,0,0,0.06)",
      }}
    >
      <div className="flex items-center gap-3">
        <div
          className="flex-shrink-0 w-12 h-12 flex items-center justify-center rounded-xl text-2xl"
          style={{ background: isDark ? (meta.bgDark ?? "var(--surface-2)") : (meta.bg ?? "var(--surface-2)") }}
        >
          {getItemEmoji(item.name)}
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-sm truncate" style={{ color: "var(--text)" }}>
            {item.name}
          </p>
          <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>
            {meta.label ?? item.category}
          </p>
        </div>
        <span className="flex-shrink-0 font-bold text-sm" style={{ color: meta.accent ?? "var(--primary)" }}>
          {formatMenuPrice(item.price)}
        </span>
      </div>

      {isClient && (
        qty > 0 ? (
          <div className="flex items-center justify-between">
            <button
              onClick={onRemove}
              className="w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm transition-colors"
              style={{ background: "var(--surface-2)", color: "var(--text)" }}
            >−</button>
            <span className="text-sm font-bold" style={{ color: "var(--primary)" }}>{qty} no pedido</span>
            <button
              onClick={onAdd}
              className="w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm text-white"
              style={{ background: "var(--primary)" }}
            >+</button>
          </div>
        ) : (
          <button
            onClick={onAdd}
            className="w-full py-1.5 rounded-xl text-xs font-semibold text-white transition-opacity hover:opacity-85"
            style={{ background: "var(--primary)" }}
          >
            + Adicionar ao pedido
          </button>
        )
      )}
    </div>
  );
}
