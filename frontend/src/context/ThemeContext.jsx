import { createContext, useContext, useState, useEffect } from "react";

// Contexto global de tema (dark/light)
const ThemeContext = createContext();

// Fornecedor de tema — envolve toda a aplicação
export function ThemeProvider({ children }) {
  // Tema activo; "dark" por omissão
  const [theme, setTheme] = useState("dark");

  // Aplica classe CSS no elemento raiz quando o tema muda
  useEffect(() => {
    const root = document.documentElement;
    if (theme === "dark") {
      root.classList.remove('light-theme');
      root.classList.add('dark-theme');
    } else {
      root.classList.remove('dark-theme');
      root.classList.add('light-theme');
    }
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
