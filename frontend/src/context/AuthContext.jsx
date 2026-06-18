import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { authService } from '@/services/authService';
import { createSingleSessionGuard, deleteCookie, getCookie, setCookie } from './sessionGuard';

// Contexto global que expõe o estado de autenticação à aplicação.
const AuthContext = createContext(null);

// Nomes dos cookies definidos em .env (VITE_AUTH_TOKEN_KEY, VITE_AUTH_LOCK_KEY).
const TOKEN_KEY     = import.meta.env.VITE_AUTH_TOKEN_KEY;
const AUTH_LOCK_KEY = import.meta.env.VITE_AUTH_LOCK_KEY;

// Provider que centraliza login, logout, token e estado da sessão.
export function AuthProvider({ children }) {
  const [user, setUser]       = useState(null);
  const [token, setToken]     = useState(() => getCookie(TOKEN_KEY));
  const [loading, setLoading] = useState(true);
  const [sessionBlocked, setSessionBlocked] = useState(false);
  const [sessionMessage, setSessionMessage] = useState('');

  const sessionGuard = useMemo(() => createSingleSessionGuard(), []);

  // Valida o token guardado no arranque
  useEffect(() => {
    if (!token) { setLoading(false); return; }

    authService.me(token)
      .then(setUser)
      .catch(() => {
        deleteCookie(TOKEN_KEY);
        deleteCookie(AUTH_LOCK_KEY);
        setToken(null);
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    const result = sessionGuard.acquire();
    if (!result.ok) {
      setSessionBlocked(true);
      setSessionMessage('Já existe uma sessão ativa neste navegador. Faça logout na sessão atual para entrar novamente.');
      return;
    }

    const syncFromStorage = () => {
      const storedToken = getCookie(TOKEN_KEY);
      if (!storedToken) {
        setToken(null);
        setUser(null);
        return;
      }

      if (storedToken !== token) {
        setToken(storedToken);
      }
    };

    syncFromStorage();
    window.addEventListener('storage', syncFromStorage);
    const unsubscribe = sessionGuard.subscribe((event) => {
      if (event.data?.type === 'auth:logout') {
        setToken(null);
        setUser(null);
        setSessionBlocked(false);
        setSessionMessage('');
      }
    });

    return () => {
      window.removeEventListener('storage', syncFromStorage);
      unsubscribe();
      sessionGuard.release();
    };
  }, [sessionGuard, token]);

  // Guarda o token e o utilizador no estado e nos cookies.
  function persist(tokenValue, userValue) {
    setCookie(TOKEN_KEY, tokenValue, 7);
    setToken(tokenValue);
    setUser(userValue);
  }

  // Autentica o utilizador e bloqueia novas sessões concorrentes.
  async function login(identifier, password) {
    const result = sessionGuard.acquire();
    if (!result.ok) {
      setSessionBlocked(true);
      setSessionMessage('Já existe uma sessão ativa neste navegador. Faça logout na sessão atual para entrar novamente.');
      throw new Error('SESSION_BUSY');
    }

    const data = await authService.login(identifier, password);
    persist(data.token, data.user);
    return data.user;
  }

  // Cria uma nova conta de utilizador.
  async function register(name, username, email, phone, password) {
    const data = await authService.register(name, username, email, phone, password);
    return data.user;
  }

  // Termina a sessão atual e limpa os dados de autenticação.
  function logout() {
    const t = token;
    deleteCookie(TOKEN_KEY);
    deleteCookie(AUTH_LOCK_KEY);
    setToken(null);
    setUser(null);
    setSessionBlocked(false);
    setSessionMessage('');
    sessionGuard.broadcast('auth:logout');
    if (t) authService.logout(t).catch(() => {});
  }

  // Atualiza os dados do utilizador já autenticado.
  function updateUser(data) { setUser(prev => ({ ...prev, ...data })); }

  return (
    <AuthContext.Provider value={{ user, token, loading, login, register, logout, updateUser, sessionBlocked, sessionMessage }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
