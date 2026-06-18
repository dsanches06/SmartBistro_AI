import { useEffect, useMemo, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router";
import { itemService } from "@/services";
import { orderService }     from "@/services/orderService";
import { orderItemService } from "@/services/orderItemService";
import { MENU_CATEGORIES, MENU_CATEGORY_META, formatMenuPrice, getItemEmoji, ALL_KEY } from "@/utils";
import { useTheme } from "@/context/ThemeContext";
import { useAuth } from "@/context/AuthContext";
import { ThemeToggle, Modal, LoginModal, RegisterModal } from "@/components/ui";

/* ── Icons ── */
// Ícone usado para abrir o modal de autenticação.
function IconLogin() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
      <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" />
      <polyline points="10 17 15 12 10 7" />
      <line x1="15" y1="12" x2="3" y2="12" />
    </svg>
  );
}

// Ícone usado para alternar para o registo.
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

/* ── NavTab (tab show/hide do BottomNav) ── */
// Botão de controlo para abrir ou fechar a navegação móvel.
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
        color: "var(--text)",
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
      <span className="text-xs font-bold uppercase tracking-widest" style={{ color: "var(--text)" }}>
        {open ? "Ocultar Menu" : "Mostrar Menu"}
      </span>
    </button>
  );
}

/* ══════════════════════════════════════════
   MainPage
══════════════════════════════════════════ */
// Página principal que junta menu, carrinho, autenticação e navegação.
export default function MainPage() {
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const { user, login, register, logout, sessionBlocked, sessionMessage } = useAuth();
  const navigate = useNavigate();
  const { pathname } = useLocation();

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

  // Indica se o utilizador atual tem acesso ao fluxo de cliente.
  const isClient  = user && user.role_id !== 1;
  const clientNavLinks = [
    { to: '/', label: 'Cardápio', icon: 'fa-utensils' },
    { to: '/perfil', label: 'Perfil', icon: 'fa-user' },
    { to: '/perfil/dashboard', label: 'Dashboard', icon: 'fa-chart-line' },
    { to: '/perfil/pedidos', label: 'Pedidos', icon: 'fa-receipt' },
  ];
  // Lista atual dos itens presentes no carrinho.
  const cartItems = useMemo(() => Object.values(cart).filter(c => c.qty > 0), [cart]);
  // Valor total do pedido em curso.
  const cartTotal = useMemo(() => cartItems.reduce((s, c) => s + Number(c.item.price) * c.qty, 0), [cartItems]);
  // Número total de unidades no carrinho.
  const cartCount = useMemo(() => cartItems.reduce((s, c) => s + c.qty, 0), [cartItems]);

  // Adiciona uma unidade de um item ao carrinho.
  const addToCart = (item) =>
    setCart(prev => ({ ...prev, [item.id]: { item, qty: (prev[item.id]?.qty || 0) + 1 } }));

  // Remove uma unidade de um item do carrinho.
  const removeFromCart = (itemId) =>
    setCart(prev => {
      const qty = (prev[itemId]?.qty || 0) - 1;
      if (qty <= 0) { const next = { ...prev }; delete next[itemId]; return next; }
      return { ...prev, [itemId]: { ...prev[itemId], qty } };
    });

  // Envia o pedido atual para a API e limpa o carrinho após o sucesso.
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

  // Faz login sem forçar redirecionamento: permanece na página principal.
  const handleLogin = async (identifier, password) => {
    await login(identifier, password);
    setShowLogin(false);
  };

  // Regista um novo utilizador e mostra a confirmação do processo.
  const handleRegister = async (name, username, email, phone, password) => {
    await register(name, username, email, phone, password);
    setShowRegister(false);
    setShowRegisterSuccess(true);
  };

  // Organiza os itens por categoria para o display agregado do menu.
  const groupedAll = useMemo(() =>
    MENU_CATEGORIES.map(cat => ({
      ...cat,
      items: items.filter(i => i.category === cat.key),
    })).filter(g => g.items.length > 0),
    [items]
  );

  // Filtra os itens da categoria atualmente selecionada.
  const filteredItems = useMemo(() =>
    items.filter(i => i.category === activeCategory),
    [items, activeCategory]
  );

  // Estilo comum para os botões de cabeçalho da interface.
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
          <span className="text-[9px] sm:text-[10px] md:text-[11px] block" style={{ color: "var(--text-muted)" }}>
            Sistema Inteligente para Restaurantes
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
        sessionBlocked={sessionBlocked}
        sessionMessage={sessionMessage}
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
            className="fixed bottom-0 left-0 right-0 z-50 flex flex-col items-center px-3"
            style={{
              background: isDark ? "rgba(28,28,30,0.97)" : "rgba(208,214,220,0.97)",
              backdropFilter: "blur(12px)",
              WebkitBackdropFilter: "blur(12px)",
              borderTop: `1px solid ${isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.12)"}`,
              boxShadow: "0 -4px 20px rgba(0,0,0,0.2)",
              padding: "0.75rem 0.625rem calc(var(--safe-bottom) + 0.75rem)",
            }}
          >
            <div
              className="absolute left-1/2 z-10"
              style={{ top: 0, transform: "translate(-50%, -100%)" }}
            >
              <NavTab open onClick={() => setNavOpen(false)} isDark={isDark} />
            </div>

            {user ? (
              <div className="grid grid-cols-2 gap-2 w-full pt-4">
                {clientNavLinks.map(({ to, label, icon }) => {
                  const active = to === "/" ? pathname === "/" || pathname === "/menu" : pathname.startsWith(to);
                  return (
                    <Link
                      key={to}
                      to={to}
                      onClick={() => setNavOpen(false)}
                      className={[
                        'group flex flex-col items-center justify-center gap-1 rounded-2xl py-3 min-h-[5rem] text-[10px] font-semibold uppercase text-center select-none transition-colors duration-200',
                        active ? 'text-[var(--primary)]' : 'text-[var(--text-muted)] hover:text-[var(--primary)]',
                      ].join(' ')}
                      aria-current={active ? 'page' : undefined}
                    >
                      <i className={`fa-solid ${icon} text-lg transition-transform duration-200 group-hover:scale-110`} aria-hidden="true" />
                      <span className="leading-none">{label}</span>
                    </Link>
                  );
                })}
              </div>
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
// Grelha que apresenta os itens do menu em formato de cartões.
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
// Cartão individual com nome, preço, categoria e ações de carrinho.
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
