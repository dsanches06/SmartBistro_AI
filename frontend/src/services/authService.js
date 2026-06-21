import { BACKEND_URL } from './BaseService.js';

// Função auxiliar para chamar os endpoints de autenticação.
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

  changePassword: (token, currentPassword, newPassword) =>
    request('/auth/change-password', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: JSON.stringify({ currentPassword, newPassword }),
    }),

  resetRequest: (username) =>
    request('/auth/reset-request', {
      method: 'POST',
      body: JSON.stringify({ username }),
    }),

  resetAddPhone: (username, phone) =>
    request('/auth/reset-add-phone', {
      method: 'POST',
      body: JSON.stringify({ username, phone }),
    }),

  resetConfirm: (username, otp, newPassword) =>
    request('/auth/reset-confirm', {
      method: 'POST',
      body: JSON.stringify({ username, otp, newPassword }),
    }),
};
