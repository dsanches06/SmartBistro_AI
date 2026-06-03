import { createContext, useContext, useEffect, useState } from 'react';
import { authService } from '@/services/authService';

const AuthContext = createContext(null);

const TOKEN_KEY = 'sb_token';

export function AuthProvider({ children }) {
  const [user, setUser]       = useState(null);
  const [token, setToken]     = useState(() => localStorage.getItem(TOKEN_KEY));
  const [loading, setLoading] = useState(true);

  // Valida o token guardado no arranque
  useEffect(() => {
    if (!token) { setLoading(false); return; }

    authService.me(token)
      .then(setUser)
      .catch(() => {
        localStorage.removeItem(TOKEN_KEY);
        setToken(null);
      })
      .finally(() => setLoading(false));
  }, []);

  function persist(token, user) {
    localStorage.setItem(TOKEN_KEY, token);
    setToken(token);
    setUser(user);
  }

  async function login(identifier, password) {
    const data = await authService.login(identifier, password);
    persist(data.token, data.user);
    return data.user;
  }

  async function register(name, username, email, phone, password) {
    const data = await authService.register(name, username, email, phone, password);
    persist(data.token, data.user);
    return data.user;
  }

  function logout() {
    const t = token;
    localStorage.removeItem(TOKEN_KEY);
    setToken(null);
    setUser(null);
    if (t) authService.logout(t).catch(() => {});
  }

  return (
    <AuthContext.Provider value={{ user, token, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
