import { BACKEND_URL } from './BaseService.js';

async function request(path, options = {}) {
  const res = await fetch(`${BACKEND_URL}${path}`, {
    headers: { 'Content-Type': 'application/json', ...options.headers },
    ...options,
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || `Erro ${res.status}`);
  return data;
}

export const authService = {
  login: (identifier, password) =>
    request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ identifier, password }),
    }),

  register: (name, username, email, phone, password) =>
    request('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ name, username, email, phone, password }),
    }),

  logout: (token) =>
    request('/auth/logout', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
    }),

  requestDelete: (token) =>
    request('/auth/request-delete', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
    }),

  me: (token) =>
    request('/auth/me', {
      headers: { Authorization: `Bearer ${token}` },
    }),
};
