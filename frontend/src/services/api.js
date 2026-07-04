import { getCookie } from '@/context/sessionGuard.js'

// Base comum para todas as chamadas HTTP do frontend.
const BASE = '/api'
const TOKEN_KEY = import.meta.env.VITE_AUTH_TOKEN_KEY

// Executa um pedido fetch com JSON e devolve a resposta já parseada.
// Injeta automaticamente o JWT (cookie) no header Authorization, quando existe.
async function request(path, options = {}) {
  const token = getCookie(TOKEN_KEY)
  const res = await fetch(`${BASE}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
    ...options,
  })
  if (!res.ok) throw new Error(`API ${res.status} — ${path}`)
  return res.json()
}

export const api = {
  get:    (path)        => request(path),
  post:   (path, body)  => request(path, { method: 'POST',   body: JSON.stringify(body) }),
  put:    (path, body)  => request(path, { method: 'PUT',    body: JSON.stringify(body) }),
  patch:  (path, body)  => request(path, { method: 'PATCH',  body: JSON.stringify(body) }),
  delete: (path)        => request(path, { method: 'DELETE' }),
}
