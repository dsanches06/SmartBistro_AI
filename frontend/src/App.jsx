import { useState, useEffect, lazy, Suspense } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router";
import MainLayout from "@/pages/MainLayout";
import { ThemeProvider } from "@/context/ThemeContext";
import { ChatUI } from "@/components/chat";
import { NAV_HANDLE_H, NAV_OPEN_H } from "@/components/ui";
import TrophySpin from "./components/ui/TrophySpin";

const DashboardPage      = lazy(() => import("@/pages/DashboardPage"));
const TablePage          = lazy(() => import("@/pages/TablePage"));
const OrdersPage         = lazy(() => import("@/pages/OrdersPage"));
const KdsPage            = lazy(() => import("@/pages/KdsPage"));
const StockPage          = lazy(() => import("@/pages/StockPage"));
const FaturacaoPage      = lazy(() => import("@/pages/FaturacaoPage"));
const RelatoriosPage     = lazy(() => import("@/pages/RelatoriosPage"));
const ClientesPage       = lazy(() => import("@/pages/ClientesPage"));
const ConfiguracoesPage  = lazy(() => import("@/pages/ConfiguracoesPage"));
const MenuPage           = lazy(() => import("@/pages/MenuPage"));
const LoginPage          = lazy(() => import("@/pages/LoginPage"));

function PageLoader() {
  return (
    <div className="flex items-center justify-center flex-1 min-h-[60vh]">
      <TrophySpin message="A carregar..." />
    </div>
  );
}

function AppContent() {
  const [showChat, setShowChat] = useState(false);
  const [bottomNavOpen, setBottomNavOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia('(max-width: 767.98px)');
    const handleResize = (event) => setIsMobile(event.matches);

    handleResize(mediaQuery);
    mediaQuery.addEventListener('change', handleResize);

    return () => mediaQuery.removeEventListener('change', handleResize);
  }, []);

  return (
    <>
      <Suspense fallback={<PageLoader />}>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/" element={<MainLayout onBottomNavChange={setBottomNavOpen} bottomNavOpen={bottomNavOpen} isMobile={isMobile} />}>
            <Route index element={<DashboardPage />} />
            <Route path="table"         element={<TablePage />} />
            <Route path="orders"        element={<OrdersPage />} />
            <Route path="kds"           element={<KdsPage />} />
            <Route path="stock"         element={<StockPage />} />
            <Route path="faturacao"     element={<FaturacaoPage />} />
            <Route path="relatorios"    element={<RelatoriosPage />} />
            <Route path="clientes"      element={<ClientesPage />} />
            <Route path="configuracoes" element={<ConfiguracoesPage />} />
            <Route path="menu"          element={<MenuPage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Routes>
      </Suspense>

      {/* Floating chat button — stays above the bottom nav (64px) */}
      {!showChat && (
        <button
          onClick={() => setShowChat(true)}
          className="fixed right-4 z-50 w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-[var(--primary)] hover:bg-[var(--primary-hover)] text-white flex items-center justify-center shadow-2xl transition-all active:scale-95"
          style={{
            bottom: isMobile
              ? bottomNavOpen
                ? `calc(${NAV_OPEN_H} + 1rem)`
                : '0.75rem'
              : '1rem',
          }}
          aria-label="Abrir chat IA"
        >
          <span className="text-lg sm:text-xl">🤖</span>
        </button>
      )}

      {/* ChatUI persists across page navigation — lives outside <Routes> */}
      <ChatUI isOpen={showChat} onClose={() => setShowChat(false)} />
    </>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <ThemeProvider>
        <AppContent />
      </ThemeProvider>
    </BrowserRouter>
  );
}
