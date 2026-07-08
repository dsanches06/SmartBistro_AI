# Fluxo de Autenticação e Token

## 1. Frontend: `AuthContext` e token

Arquivo: [`frontend/src/context/AuthContext.jsx`](../frontend/src/context/AuthContext.jsx)

- Linha 9: `TOKEN_KEY = import.meta.env.VITE_AUTH_TOKEN_KEY`
- Linha 15: lê token do cookie com `getCookie(TOKEN_KEY)`
- Linha 26: valida token no arranque com `authService.me(token)`
- Linha 77-78: `persist(tokenValue, userValue)` guarda token no cookie e estado
- Linha 91-92: `login(...)` autêntica e persiste token + utilizador
- Linha 103-112: `logout()` limpa cookie e estado, notifica outras abas com `sessionGuard.broadcast('auth:logout')`

## 2. Frontend: cabeçalhos de autorização

Arquivo: [`frontend/src/services/authService.js`](../frontend/src/services/authService.js)

- Linha 33: `logout()` envia `Authorization: Bearer ${token}`
- Linha 40: `me()` envia `Authorization: Bearer ${token}`
- Linha 46: `changePassword()` envia `Authorization: Bearer ${token}`
- Linha 53: `requestDelete()` envia `Authorization: Bearer ${token}`

Arquivo: [`frontend/src/services/api.js`](../frontend/src/services/api.js)

- injeta token automaticamente em TODO request via cookie `VITE_AUTH_TOKEN_KEY`
- linhas 7-25: função `request(path, options)` adiciona `Authorization` quando existe token

## 3. Backend: middleware de token

Arquivo: [`backend/src/middlewares/authMiddleware.js`](../backend/src/middlewares/authMiddleware.js)

- Linha 5: `verifyToken(req, res, next)`
  - extrai `Authorization` do header
  - valida JWT com `jwt.verify(token, process.env.JWT_SECRET)`
  - coloca payload em `req.user`
- Linha 22: `requireRole(...roles)` verifica `req.user?.role_id`
  - devolve 403 se usuário não tiver permissões

## 4. Uso do `user_id` em chat

Arquivo: [`frontend/src/components/chat/ChatUI.jsx`](../frontend/src/components/chat/ChatUI.jsx)

- Linha 240: envia `user_id: user?.id ?? null` para o backend

Arquivo: [`backend/src/controllers/chatBotController.js`](../backend/src/controllers/chatBotController.js)

- Linha 27: recebe `user_id` no corpo da requisição
- Linha 44-46: usa `user_id` ao criar conversa
- o `user_id` permite ligar a conversa a um utilizador autenticado sempre que disponível

## 5. Notas importantes

- O frontend guarda o token em cookie e o envia automaticamente em endpoints protegidos.
- O webhook/public chat não requer token para `POST /chat/message/stream` e `GET /chat/history/conversation/:conversationId`.
- Outros endpoints de chat history e funções críticas usam `verifyToken` + `requireRole` no backend.
