import { useEffect, useRef, useState } from "react";
import { Link } from "react-router";
import { itemService } from "@/services";
import { MENU_CATEGORIES, MENU_CATEGORY_META, formatMenuPrice, getItemEmoji } from "@/utils";
import { useTheme } from "@/context/ThemeContext";
import { ThemeToggle } from "@/components/ui";

const ALL_KEY = "all";

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
function Modal({ open, onClose, title, children, isDark }) {
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
        className="w-full max-w-sm rounded-2xl p-6 shadow-2xl"
        style={{
          background: "var(--surface)",
          border: "1px solid var(--border)",
        }}
      >
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-bold" style={{ color: "var(--text)" }}>{title}</h2>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg transition-colors"
            style={{ color: "var(--text-muted)" }}
            onMouseEnter={e => e.currentTarget.style.background = "var(--surface-2)"}
            onMouseLeave={e => e.currentTarget.style.background = "transparent"}
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
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>
        {label}
      </label>
      <input
        type={type}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        autoFocus={autoFocus}
        className="w-full rounded-xl px-3.5 py-2.5 text-sm outline-none transition-all"
        style={{
          background: "var(--surface-2)",
          border: "1.5px solid var(--border)",
          color: "var(--text)",
        }}
        onFocus={e => e.target.style.borderColor = "var(--primary)"}
        onBlur={e => e.target.style.borderColor = "var(--border)"}
      />
    </div>
  );
}

/* ── Modal Login ── */
function LoginModal({ open, onClose, onSwitchToRegister, isDark }) {
  const [email, setEmail]       = useState("");
  const [password, setPassword] = useState("");

  const handleClose = () => { setEmail(""); setPassword(""); onClose(); };

  return (
    <Modal open={open} onClose={handleClose} title="Entrar na conta" isDark={isDark}>
      <form className="flex flex-col gap-4" onSubmit={e => e.preventDefault()}>
        <Field label="E-mail" type="email" value={email} onChange={setEmail} placeholder="exemplo@email.com" autoFocus />
        <Field label="Palavra-passe" type="password" value={password} onChange={setPassword} placeholder="••••••••" />

        <button
          type="submit"
          className="w-full py-2.5 rounded-xl text-sm font-bold transition-opacity hover:opacity-90 mt-1"
          style={{ background: "var(--primary)", color: "#fff" }}
        >
          Entrar
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
function RegisterModal({ open, onClose, onSwitchToLogin, isDark }) {
  const [name, setName]         = useState("");
  const [email, setEmail]       = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm]   = useState("");

  const handleClose = () => { setName(""); setEmail(""); setPassword(""); setConfirm(""); onClose(); };

  return (
    <Modal open={open} onClose={handleClose} title="Criar conta" isDark={isDark}>
      <form className="flex flex-col gap-4" onSubmit={e => e.preventDefault()}>
        <Field label="Nome completo" value={name} onChange={setName} placeholder="O teu nome" autoFocus />
        <Field label="E-mail" type="email" value={email} onChange={setEmail} placeholder="exemplo@email.com" />
        <Field label="Palavra-passe" type="password" value={password} onChange={setPassword} placeholder="••••••••" />
        <Field label="Confirmar palavra-passe" type="password" value={confirm} onChange={setConfirm} placeholder="••••••••" />

        <button
          type="submit"
          className="w-full py-2.5 rounded-xl text-sm font-bold transition-opacity hover:opacity-90 mt-1"
          style={{ background: "var(--primary)", color: "#fff" }}
        >
          Criar conta
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

/* ══════════════════════════════════════════
   MainPage
══════════════════════════════════════════ */
export default function MainPage() {
  const { theme } = useTheme();
  const isDark = theme === "dark";

  const [items, setItems]               = useState([]);
  const [loading, setLoading]           = useState(true);
  const [activeCategory, setActiveCategory] = useState(ALL_KEY);
  const [showLogin, setShowLogin]       = useState(false);
  const [showRegister, setShowRegister] = useState(false);

  useEffect(() => {
    itemService.getActive()
      .then(setItems)
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
  }, []);

  const groupedAll = MENU_CATEGORIES.map(cat => ({
    ...cat,
    items: items.filter(i => i.category === cat.key),
  })).filter(g => g.items.length > 0);

  const filteredItems = items.filter(i => i.category === activeCategory);

  const headerBtnStyle = {
    color: "var(--text-secondary)",
    border: "1.5px solid var(--border)",
    background: "var(--surface)",
  };

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg)", color: "var(--text)" }}>
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
          <button
            onClick={() => setShowLogin(true)}
            title="Entrar"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all hover:border-[var(--primary)] hover:text-[var(--primary)]"
            style={headerBtnStyle}
          >
            <IconLogin />
            <span className="hidden sm:inline">Entrar</span>
          </button>

          <button
            onClick={() => setShowRegister(true)}
            title="Registar"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all"
            style={{ background: "var(--primary)", color: "#fff", border: "1.5px solid var(--primary)" }}
          >
            <IconRegister />
            <span className="hidden sm:inline">Registar</span>
          </button>

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
      <div className="flex items-center justify-center gap-2 overflow-x-auto px-4 sm:px-8 pb-3 no-scrollbar max-w-5xl mx-auto">
        <button
          onClick={() => setActiveCategory(ALL_KEY)}
          className="flex-shrink-0 px-4 py-2 rounded-full text-sm font-semibold transition-all"
          style={{
            background: activeCategory === ALL_KEY ? "var(--primary)" : "var(--surface-2)",
            color: activeCategory === ALL_KEY ? "#fff" : "var(--text-secondary)",
          }}
        >
          Todos
        </button>
        {MENU_CATEGORIES.map(cat => (
          <button
            key={cat.key}
            onClick={() => setActiveCategory(cat.key)}
            className="flex-shrink-0 flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-semibold transition-all"
            style={{
              background: activeCategory === cat.key ? cat.accent : "var(--surface-2)",
              color: activeCategory === cat.key ? "#fff" : "var(--text-secondary)",
            }}
          >
            <span>{cat.emoji}</span>
            {cat.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <main className="px-4 sm:px-8 py-6 max-w-5xl mx-auto pb-12">
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
                  <ItemGrid items={catItems} isDark={isDark} />
                </section>
              ))
            )}
          </div>
        ) : (
          <ItemGrid items={filteredItems} isDark={isDark} />
        )}
      </main>

      {/* Modais */}
      <LoginModal
        open={showLogin}
        onClose={() => setShowLogin(false)}
        onSwitchToRegister={() => setShowRegister(true)}
        isDark={isDark}
      />
      <RegisterModal
        open={showRegister}
        onClose={() => setShowRegister(false)}
        onSwitchToLogin={() => setShowLogin(true)}
        isDark={isDark}
      />
    </div>
  );
}

/* ── ItemGrid ── */
function ItemGrid({ items, isDark }) {
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
        <ItemCard key={item.id} item={item} isDark={isDark} />
      ))}
    </div>
  );
}

/* ── ItemCard ── */
function ItemCard({ item, isDark }) {
  const meta = MENU_CATEGORY_META[item.category] ?? {};
  return (
    <div
      className="flex items-center gap-3 rounded-2xl p-4 transition-transform hover:scale-[1.02]"
      style={{
        background: "var(--surface)",
        border: "1px solid var(--border)",
        boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
      }}
    >
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
  );
}
