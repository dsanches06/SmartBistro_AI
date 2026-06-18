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
function writeCookie(name, value, days = 7, maxAgeSeconds = null) {
  if (typeof document === 'undefined') return;
  const cookieParts = [`${name}=${encodeURIComponent(value)}`, 'path=/', 'SameSite=Lax'];
  if (maxAgeSeconds != null) {
    cookieParts.push(`max-age=${Math.max(0, Math.floor(maxAgeSeconds))}`);
  } else {
    const expires = new Date(Date.now() + days * 24 * 60 * 60 * 1000).toUTCString();
    cookieParts.push(`expires=${expires}`);
  }
  document.cookie = cookieParts.join('; ');
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

const DEFAULT_LOCK_DURATION_MS = Number(import.meta.env.VITE_AUTH_LOCK_DURATION_MS) || 5 * 60 * 1000;

// Gera e controla uma sessão única por navegador para bloquear múltiplos logins concorrentes.
export function createSingleSessionGuard({ storage = typeof window !== 'undefined' ? window.sessionStorage : null, channel = null, sessionId = null, lockDurationMs = DEFAULT_LOCK_DURATION_MS } = {}) {
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

  const parseLockCookie = (value) => {
    if (!value) return null;
    const [id, timestamp] = value.split('|');
    const createdAt = Number(timestamp);
    if (!id || Number.isNaN(createdAt)) return null;
    return { id, createdAt };
  };

  const acquire = () => {
    const activeLock = parseLockCookie(readCookie(LOCK_KEY));
    const now = Date.now();
    if (activeLock && activeLock.id !== currentSessionId) {
      if (now - activeLock.createdAt < lockDurationMs) {
        return { ok: false, reason: 'SESSION_BUSY' };
      }
    }

    writeCookie(LOCK_KEY, `${currentSessionId}|${now}`, undefined, Math.max(1, Math.floor(lockDurationMs / 1000)));
    return { ok: true, sessionId: currentSessionId };
  };

  const release = () => {
    const activeLock = parseLockCookie(readCookie(LOCK_KEY));
    if (activeLock?.id === currentSessionId) {
      eraseCookie(LOCK_KEY);
    }
  };

  const close = () => {
    channelInstance?.close();
  };

  return { acquire, release, subscribe, broadcast, close, getSessionId: () => currentSessionId };
}
