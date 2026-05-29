import { useTheme } from '../../context/ThemeContext';

// Botão que alterna entre tema dark (sol) e light (lua)
export function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();

  return (
    <button
      onClick={toggleTheme}
      aria-label={`Alternar para tema ${theme === 'dark' ? 'claro' : 'escuro'}`}
      title={`Alternar para ${theme === 'dark' ? 'light' : 'dark'} theme`}
      className={`p-2 rounded-lg transition-all flex items-center justify-center ${
        theme === 'dark'
          ? 'hover:bg-white/10 text-white'
          : 'hover:bg-black/10 text-black'
      }`}
    >
      {/* Sol no tema dark → clicar passa para light; Lua no light → clicar passa para dark */}
      {theme === 'dark' ? (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="w-5 h-5"
        >
          <circle cx="12" cy="12" r="4" fill="currentColor" />
          <path d="M12 2v2" />
          <path d="M12 20v2" />
          <path d="M4.93 4.93l1.41 1.41" />
          <path d="M17.66 17.66l1.41 1.41" />
          <path d="M2 12h2" />
          <path d="M20 12h2" />
          <path d="M4.93 19.07l1.41-1.41" />
          <path d="M17.66 6.34l1.41-1.41" />
        </svg>
      ) : (
        <svg viewBox="0 0 512 512" className="w-4 h-4 -scale-x-100">
          <path
            fill="currentColor"
            d="M256 0C114.6 0 0 114.6 0 256S114.6 512 256 512c68.8 0 131.3-27.2 177.3-71.4 7.3-7 9.4-17.9 5.3-27.1s-13.7-14.9-23.8-14.1c-4.9 .4-9.8 .6-14.8 .6-101.6 0-184-82.4-184-184 0-72.1 41.5-134.6 102.1-164.8 9.1-4.5 14.3-14.3 13.1-24.4S322.6 8.5 312.7 6.3C294.4 2.2 275.4 0 256 0z"
          />
        </svg>
      )}
    </button>
  );
}
