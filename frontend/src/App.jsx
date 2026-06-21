import { useState, useEffect, lazy, Suspense } from "react";
import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router";
import MainLayout from "@/pages/layout/MainLayout";
import { ThemeProvider } from "@/context/ThemeContext";
import { AuthProvider, useAuth } from "@/context/AuthContext";
import { TableRefreshProvider } from "@/context/TableRefreshContext";
import ProtectedRoute from "@/components/auth/ProtectedRoute";
import AdminRoute from "@/components/auth/AdminRoute";
import { ChatUI } from "@/components/chat";
import { NAV_OPEN_H, TrophySpin } from "@/components/ui";
import { orderService } from "@/services/orderService";

// Carrega as páginas principais sob demanda para reduzir o bundle inicial.
const MainPage               = lazy(() => import("@/pages/layout/MainPage"));
const DashboardPage          = lazy(() => import("@/pages/admin/DashboardPage"));
const TablePage              = lazy(() => import("@/pages/admin/TablePage"));
const OrdersPage             = lazy(() => import("@/pages/admin/OrdersPage"));
const KdsPage                = lazy(() => import("@/pages/admin/KdsPage"));
const StockPage              = lazy(() => import("@/pages/admin/StockPage"));
const FaturacaoPage          = lazy(() => import("@/pages/admin/FaturacaoPage"));
const RelatoriosPage         = lazy(() => import("@/pages/admin/RelatoriosPage"));
const ClientesPage           = lazy(() => import("@/pages/admin/ClientesPage"));
const MenuPage               = lazy(() => import("@/pages/admin/MenuPage"));
const CustomerProfilePage    = lazy(() => import("@/pages/customer/ProfilePage"));
const CustomerDashboardPage  = lazy(() => import("@/pages/customer/DashboardPage"));
const CustomerOrdersPage     = lazy(() => import("@/pages/customer/OrdersPage"));

// Serviço de background para qualquer utilizador autenticado:
// 1. Avança In Preparation → Ready → Delivered via backend (sem auth de admin)
// 2. Chama chefStart para pedidos Pending antigos do próprio utilizador
//    (pedidos criados via chatbot que não foram processados pelo Chef AI)
function OrderAutoAdvance() {
  const { user } = useAuth();

  useEffect(() => {
    if (!user) return;

    const advance = async () => {
      // Avança estados: In Preparation → Ready → Delivered
      orderService.autoAdvance().catch(() => {});

      // Fallback Chef AI: pedidos Pending há mais de 45s (chatbot ou chefStart falhado)
      try {
        const orders = await orderService.getByUser(user.id).catch(() => []);
        const now = Date.now();
        (Array.isArray(orders) ? orders : [])
          .filter(o => {
            if (o.order_status !== 'Pending') return false;
            const ref = new Date(o.updated_at || o.created_at).getTime();
            return (now - ref) / 1000 >= 45;
          })
          .forEach(o => orderService.chefStart(o.id).catch(() => {}));
      } catch { /* silent */ }
    };

    advance();
    const id = setInterval(advance, 30_000);
    return () => clearInterval(id);
  }, [user?.id]);

  return null;
}

// Indicador visual mostrado enquanto uma página ainda está a carregar.
function PageLoader() {
  return (
    <div className="flex items-center justify-center flex-1 min-h-[60vh]">
      <TrophySpin message="A carregar..." />
    </div>
  );
}

// Redireciona staff (role_id=1) para o dashboard; utilizadores normais ficam na página pública.
function StaffGuard({ children }) {
  const { user } = useAuth();
  if (user?.role_id === 1) return <Navigate to="/dashboard" replace />;
  return children;
}

// Componente principal que monta o router, os providers e o chat flutuante.
function MenuRoute({ bottomNavOpen, onBottomNavChange, isMobile }) {
  const { user } = useAuth();
  return user?.role_id === 1 ? (
    <MainLayout onBottomNavChange={onBottomNavChange} bottomNavOpen={bottomNavOpen} isMobile={isMobile}>
      <MenuPage />
    </MainLayout>
  ) : (
    <MainPage />
  );
}

function AppContent() {
  const [showChat, setShowChat] = useState(false);
  const [bottomNavOpen, setBottomNavOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const { pathname } = useLocation();
  const { user } = useAuth();
  const isStaff = user?.role_id === 1;

  useEffect(() => {
    const mediaQuery = window.matchMedia('(max-width: 767.98px)');
    const handleResize = (event) => setIsMobile(event.matches);

    handleResize(mediaQuery);
    mediaQuery.addEventListener('change', handleResize);

    return () => mediaQuery.removeEventListener('change', handleResize);
  }, []);

  return (
    <TableRefreshProvider>
      <OrderAutoAdvance />
      <Suspense fallback={<PageLoader />}>
        <Routes>
          <Route path="/" element={<StaffGuard><MainPage onNavChange={setBottomNavOpen} /></StaffGuard>} />
          <Route path="/menu" element={
            <MenuRoute
              bottomNavOpen={bottomNavOpen}
              onBottomNavChange={setBottomNavOpen}
              isMobile={isMobile}
            />
          } />
          {/* Rotas autenticadas — MainLayout para todos */}
          <Route element={<ProtectedRoute />}>
            <Route element={<MainLayout onBottomNavChange={setBottomNavOpen} bottomNavOpen={bottomNavOpen} isMobile={isMobile} />}>
              {/* Clientes / utilizadores normais */}
              <Route path="/perfil" element={<CustomerProfilePage />} />
              <Route path="/perfil/dashboard" element={<CustomerDashboardPage />} />
              <Route path="/perfil/pedidos" element={<CustomerOrdersPage />} />

              {/* Apenas admin/manager (role_id=1) */}
              <Route element={<AdminRoute />}>
                <Route path="/dashboard"     element={<DashboardPage />} />
                <Route path="/table"         element={<TablePage />} />
                <Route path="/orders"        element={<OrdersPage />} />
                <Route path="/kds"           element={<KdsPage />} />
                <Route path="/stock"         element={<StockPage />} />
                <Route path="/faturacao"     element={<FaturacaoPage />} />
                <Route path="/relatorios"    element={<RelatoriosPage />} />
                <Route path="/clientes"      element={<ClientesPage />} />
              </Route>
            </Route>
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>

      {/* Floating chat button */}
      {!showChat && (
        <button
          onClick={() => setShowChat(true)}
          className="fixed right-4 z-50 w-9 h-9 sm:w-11 sm:h-11 rounded-full bg-[var(--primary)] hover:bg-[var(--primary-hover)] text-white flex items-center justify-center shadow-2xl transition-all active:scale-95"
          style={{
            bottom: isMobile
              ? bottomNavOpen
                ? isStaff
                  ? `calc(${NAV_OPEN_H} + 1rem)`
                  : '10rem'
                : user
                  ? 'calc(env(safe-area-inset-bottom, 60px) + 0.75rem)'
                  : 'calc(env(safe-area-inset-bottom, 60px) + 4rem)'
              : '1rem',
          }}
          aria-label="Abrir chat IA"
        >
          <span className="text-sm sm:text-base">🤖</span>
        </button>
      )}

      {/* ChatUI persists across page navigation */}
      <ChatUI isOpen={showChat} onClose={() => setShowChat(false)} />
    </TableRefreshProvider>
  );
}

// Ponto de entrada da aplicação React.
export default function App() {
  return (
    <BrowserRouter>
      <ThemeProvider>
        <AuthProvider>
          <AppContent />
        </AuthProvider>
      </ThemeProvider>
    </BrowserRouter>
  );
}
