// Cabeçalho do chat — responsive: sem bordas arredondadas no topo em mobile (full-screen)
export function ChatHeaderUI({ onClose }) {
  return (
    <div className="flex items-center justify-between px-4 sm:px-6 py-3 sm:py-4 bg-[var(--primary)] text-white md:rounded-t-3xl shadow-lg flex-shrink-0">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-white/20 flex items-center justify-center flex-shrink-0">
          <span className="text-lg sm:text-xl">🍽️</span>
        </div>
        <div>
          <h2 className="text-base sm:text-lg font-bold">SmartBistro AI</h2>
          <div className="flex items-center gap-1.5 text-xs sm:text-sm text-white/80">
            <span className="h-2 w-2 rounded-full bg-emerald-300 inline-block flex-shrink-0" />
            <span>Assistente do Restaurante</span>
          </div>
        </div>
      </div>
      <button
        onClick={onClose}
        className="text-white/90 hover:text-white transition text-xl w-9 h-9 sm:w-10 sm:h-10 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 flex-shrink-0"
        aria-label="Fechar chat"
      >
        ✕
      </button>
    </div>
  );
}
