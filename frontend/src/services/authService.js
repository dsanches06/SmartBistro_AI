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
  // Autentica o utilizador por username ou e-mail e devolve token + dados do utilizador.
  login: (identifier, password) =>
    request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ identifier, password }),
    }),

  // Cria uma nova conta e devolve token + dados do utilizador recém-criado.
  register: (name, username, email, phone, password) =>
    request('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ name, username, email, phone, password }),
    }),

  // Marca o utilizador como inativo no servidor e invalida a sessão.
  logout: (token) =>
    request('/auth/logout', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
    }),

  // Envia pedido de eliminação de conta aos administradores ativos.
  requestDelete: (token) =>
    request('/auth/request-delete', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
    }),

  // Devolve os dados do utilizador autenticado a partir do token JWT.
  me: (token) =>
    request('/auth/me', {
      headers: { Authorization: `Bearer ${token}` },
    }),

  // Altera a palavra-passe verificando primeiro a senha atual.
  changePassword: (token, currentPassword, newPassword) =>
    request('/auth/change-password', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: JSON.stringify({ currentPassword, newPassword }),
    }),

  // Verifica se o username existe e envia OTP para o telemóvel associado.
  // Devolve { needsPhone } se o utilizador ainda não tiver número registado.
  resetRequest: (username) =>
    request('/auth/reset-request', {
      method: 'POST',
      body: JSON.stringify({ username }),
    }),

  // Associa um novo número de telemóvel ao utilizador e envia o OTP.
  // Usado quando o utilizador não tinha telemóvel no perfil.
  resetAddPhone: (username, phone) =>
    request('/auth/reset-add-phone', {
      method: 'POST',
      body: JSON.stringify({ username, phone }),
    }),

  // Valida o OTP e define a nova palavra-passe.
  // O código expira 10 minutos após geração e só pode ser usado uma vez.
  resetConfirm: (username, otp, newPassword) =>
    request('/auth/reset-confirm', {
      method: 'POST',
      body: JSON.stringify({ username, otp, newPassword }),
    }),
};
