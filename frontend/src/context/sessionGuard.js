// Nomes dos cookies/chaves definidos em .env (VITE_AUTH_LOCK_KEY, VITE_SESSION_ID_KEY, VITE_AUTH_CHANNEL_NAME).
export const LOCK_KEY       = import.meta.env.VITE_AUTH_LOCK_KEY;
export const SESSION_ID_KEY = import.meta.env.VITE_SESSION_ID_KEY;
export const CHANNEL_NAME   = import.meta.env.VITE_AUTH_CHANNEL_NAME;

// Lê um cookie do navegador.
function readCookie(name) {
  if (typeof document === 'undefined') return null;
  const match = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : null;
}

// Guarda um cookie com expiração opcional.
function writeCookie(name, value, days = 7) {
  if (typeof document === 'undefined') return;
  const expires = new Date(Date.now() + days * 24 * 60 * 60 * 1000).toUTCString();
  document.cookie = `${name}=${encodeURIComponent(value)}; path=/; expires=${expires}; SameSite=Lax`;
}

// Remove um cookie do navegador.
function eraseCookie(name) {
  if (typeof document === 'undefined') return;
  document.cookie = `${name}=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax`;
}

// Devolve o valor de um cookie.
export function getCookie(name) {
  return readCookie(name);
}

// Cria ou atualiza um cookie.
export function setCookie(name, value, days = 7) {
  writeCookie(name, value, days);
}

// Apaga um cookie existente.
export function deleteCookie(name) {
  eraseCookie(name);
}

// Gera e controla uma sessão única por navegador para bloquear múltiplos logins concorrentes.
export function createSingleSessionGuard({ storage = typeof window !== 'undefined' ? window.sessionStorage : null, channel = null, sessionId = null } = {}) {
  const currentSessionId = sessionId || storage?.getItem(SESSION_ID_KEY) || `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  storage?.setItem(SESSION_ID_KEY, currentSessionId);

  const channelInstance = channel ?? (typeof window !== 'undefined' && 'BroadcastChannel' in window ? new BroadcastChannel(CHANNEL_NAME) : null);

  const broadcast = (type, payload = {}) => {
    if (channelInstance) {
      channelInstance.postMessage({ type, sessionId: currentSessionId, ...payload });
    }
  };

  const subscribe = (handler) => {
    if (!channelInstance) return () => {};
    channelInstance.addEventListener('message', handler);
    return () => channelInstance.removeEventListener('message', handler);
  };

  const acquire = () => {
    const activeSessionId = readCookie(LOCK_KEY);
    if (activeSessionId && activeSessionId !== currentSessionId) {
      return { ok: false, reason: 'SESSION_BUSY' };
    }

    writeCookie(LOCK_KEY, currentSessionId, 1);
    return { ok: true, sessionId: currentSessionId };
  };

  const release = () => {
    const activeSessionId = readCookie(LOCK_KEY);
    if (activeSessionId === currentSessionId) {
      eraseCookie(LOCK_KEY);
    }
  };

  const close = () => {
    channelInstance?.close();
  };

  return { acquire, release, subscribe, broadcast, close, getSessionId: () => currentSessionId };
}
