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

// Fallback para Vercel (serverless): o Chef AI usa setTimeout no backend para avançar
// estados, mas em ambientes serverless os timeouts não persistem entre invocações.
// Este componente chama /orders/auto-advance como segurança extra para qualquer utilizador.
// Em servidor local (Node.js), o scheduleChefAdvance no backend trata de tudo.
function OrderAutoAdvance() {
  const { user } = useAuth();

  useEffect(() => {
    if (!user) return;

    const advance = () => {
      orderService.autoAdvance().catch(() => {});
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
  const isPublicPage = pathname === "/" || pathname === "/login";

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
          <Route path="/" element={<MainPage />} />
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
          className="fixed right-4 z-50 w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-[var(--primary)] hover:bg-[var(--primary-hover)] text-white flex items-center justify-center shadow-2xl transition-all active:scale-95"
          style={{
            bottom: isMobile
              ? isPublicPage
                ? '4.5rem'                            // acima do BottomNav do MainPage (~56px)
                : bottomNavOpen
                  ? `calc(${NAV_OPEN_H} + 1rem)`
                  : '0.75rem'
              : '1rem',
          }}
          aria-label="Abrir chat IA"
        >
          <span className="text-lg sm:text-xl">🤖</span>
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
