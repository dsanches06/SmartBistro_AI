import { Outlet } from "react-router";
import { Header, Footer, BottomNav, NAV_HANDLE_H, NAV_OPEN_H } from "@/components/ui";

// Layout principal — envolve todas as páginas com cabeçalho, rodapé e navegação
export default function MainLayout({ onBottomNavChange, bottomNavOpen, isMobile }) {
  return (
    <div className="min-h-screen bg-page flex flex-col">
      <Header />

      {/* main: top padding = header height; bottom padding = bottom nav height on mobile */}
      <main
        className="flex-1 min-h-0 overflow-auto pt-[56px] md:pt-[64px] md:pb-0"
        style={{
          paddingBottom: isMobile
            ? bottomNavOpen
              ? `calc(${NAV_OPEN_H} + 1.25rem)`
              : `calc(var(--safe-bottom) + ${NAV_HANDLE_H})`
            : undefined,
        }}
      >
        <Outlet />
      </main>

      {/* Rodapé visível apenas em desktop */}
      <div className="hidden md:block">
        <Footer />
      </div>

      {/* Navegação inferior para mobile */}
      <BottomNav onOpenChange={onBottomNavChange} />
    </div>
  );
}
