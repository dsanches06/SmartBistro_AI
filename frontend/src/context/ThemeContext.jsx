import { createContext, useContext, useState, useEffect } from "react";

// Contexto global que controla o tema claro/escuro da aplicação.
const ThemeContext = createContext();

// Fornecedor de tema que envolve toda a aplicação.
export function ThemeProvider({ children }) {
  // Tema activo — lê do localStorage ou usa "dark" por omissão
  const [theme, setTheme] = useState(() => localStorage.getItem("sb-theme") ?? "dark");

  // Aplica classe CSS no elemento raiz e persiste no localStorage
  useEffect(() => {
    const root = document.documentElement;
    if (theme === "dark") {
      root.classList.remove('light-theme');
      root.classList.add('dark-theme');
    } else {
      root.classList.remove('dark-theme');
      root.classList.add('light-theme');
    }
    localStorage.setItem("sb-theme", theme);
  }, [theme]);

  // Alterna entre dark e light
  const toggleTheme = () => {
    setTheme((prev) => (prev === "dark" ? "light" : "dark"));
  };

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

// Hook personalizado para facilitar o uso
export const useTheme = () => useContext(ThemeContext);
