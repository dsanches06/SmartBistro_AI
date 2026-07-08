# Fluxo Completo de Chatbot: Frontend → Backend

## 1. Frontend: chat UI e histórico

Arquivo: [`frontend/src/components/chat/ChatUI.jsx`](../frontend/src/components/chat/ChatUI.jsx)
- Linha 71: `handleSelectConversation(conv)`
  - chama `chatService.getChatHistory(conv.id)`
  - converte o histórico para `{ role, content }`
  - atualiza `conversationHistory` e `messages`
- Linha 115: `TABLE_MUTATION_FNS`
  - lista as funções de domínio que disparam `triggerTableRefresh()`
- Linha 190: `doSend(userMessage)`
  - monta `updatedHistory`
  - adiciona mensagem do utilizador + placeholder do bot em `messages`
  - chama `chatService.sendMessageToBotStream(...)`
  - passa `conversationId`, `user?.id ?? null`, `customerName`

## 2. Frontend: serviço de chat e SSE

Arquivo: [`frontend/src/services/chatService.js`](../frontend/src/services/chatService.js)
- Linha 20: `async sendMessageToBotStream(...)`
  - payload: `{ message, conversationHistory, conversationId, user_id, customer_name }`
  - POST para `/chat/message/stream`
- Linha 39: trata `response.ok === false`
  - lê JSON de erro do servidor
  - chama `onDone({ success: false, providerError: false, errorType, message })`
- Linha 61+: parser SSE
  - `event: message` → `onChunk(parsed.text)`
  - `event: done` → `onDone(parsed)`
  - `provider_error`, `rate_limit`, `service_unavailable`, `auth_error`, `network_error`, `invalid_request` → `onDone({ success:false, providerError:true, ... })`
  - `event: error` → `onDone({ success:false, providerError:false, ... })`
- Linha 291: `getChatHistory(conversationId)`
  - GET `/chat/history/conversation/${conversationId}`

## 3. Frontend: autenticação / token

Arquivo: [`frontend/src/context/AuthContext.jsx`](../frontend/src/context/AuthContext.jsx)
- Linha 76: `function persist(tokenValue, userValue)`
  - guarda token no cookie
  - atualiza estado `token` e `user`
- Linha 83: `async function login(identifier, password)`
  - chama `authService.login(...)`
  - persiste `token` e `user`
- Linha 89: `logout()`
  - remove cookie
  - limpa estado
  - broadcast `auth:logout`

Arquivo: [`frontend/src/services/api.js`](../frontend/src/services/api.js)
- Linha 10: `const token = getCookie(TOKEN_KEY)`
- Linha 12: adiciona `Authorization: Bearer ${token}` se houver token
- Função `request(path, options = {})` é usado por `tableService`, `paymentService`, e outras APIs protegidas.

## 4. Backend: rotas de chat

Arquivo: [`backend/src/routes/chatRoutes.js`](../backend/src/routes/chatRoutes.js)
- Linha 11: `router.post("/message/stream", chatBotController.sendMessageToBotStream)`
  - rota principal SSE pública
- Linha 14: `router.post("/message", chatBotController.sendMessageToBotStream)`
  - compatibilidade legada
- Linha 20: `router.post("/conversation/:conversationId/message", chatBotController.sendMessageToConversation)`
  - adiciona mensagem a conversa existente sem SSE
- Linha 23: `router.get("/history/conversation/:conversationId", chatHistoryController.getByConversationId)`
  - histórico de conversa público

## 5. Backend: controller do chatbot

Arquivo: [`backend/src/controllers/chatBotController.js`](../backend/src/controllers/chatBotController.js)
- Linha 26: `export async function sendMessageToBotStream(req, res)`
  - valida `message`
  - executa `checkMessageTokenLimit(message)` (limite 100 tokens)
  - configura SSE e `ping` a cada 20s
- Linha 56: chama `processChatStream(...)`
  - `onChunk`: escreve `event: message`
  - `onDone`: cria histórico de assistente e escreve `event: done`
  - o payload final inclui `conversationId`, `success`, `message`, `functionResults`
- Linha 103: `sendMessageToConversation(req, res)`
  - guarda a mensagem do usuário em conversa existente

## 6. Backend: orquestrador e function calling

Arquivo: [`backend/src/genai/orchestrations/chatBotProcessor.js`](../backend/src/genai/orchestrations/chatBotProcessor.js)
- Linha 77: `export const FUNCTION_HANDLERS`
  - define handlers para funções que o bot pode chamar
  - exemplos: `find_or_create_user`, `get_table`, `submit_order`, `create_group_reservation`, `redeem_customer_points`
- Linha 357: `async function getOrCreateSession(conversationId, customerName = null)`
  - reutiliza sessão em `sessions` se existir
  - carrega `getChatHistoryByConversationId(conversationId)` para reconstruir contexto
- Linha 381: `export async function processChatStream(...)`
  - obtém `processor = await getOrCreateSession(...)`
  - chama `processor.chat(message, onChunk)`
  - `onDone(result.message || '', result.functionResults ?? [])`
  - em erro, classifica com `classifyClaudeError(err)` e chama `onError`

## 7. Backend: tratamento de erros SSE

Arquivo: [`backend/src/utils/chatBotUtil.js`](../backend/src/utils/chatBotUtil.js)
- Linha 11: `export const SSE_ERROR_EVENT`
- Linha 26: `export function writeSseError(res, err)`
  - escreve evento SSE baseado em `err.aiErrorType`
  - inclui `success: false`, `errorType`, `message`

## 8. Frontend: tabela e mesass agrupadas

Arquivo: [`frontend/src/services/tableService.js`](../frontend/src/services/tableService.js)
- Linha 13: `createGroup(tableIds, userId)`
  - POST `/tables/groups`
- Linha 14: `dissolveGroup(groupId)`
  - DELETE `/tables/groups/${groupId}`

Arquivo: [`frontend/src/pages/admin/TablePage.jsx`](../frontend/src/pages/admin/TablePage.jsx)
- Linha 393: `await tableService.createGroup([table.id, ...], user.id)`
- Linha 1033: `await tableService.dissolveGroup(tableDetails.group.id)`
- Linha 1098: `const handleDissolveGroup = async () => { ... }`
- Linha 1520: botão `onClick={handleDissolveGroup}`

## 9. Resumo do fluxo

1. Usuário digita no chat UI.
2. `ChatUI.jsx` chama `chatService.sendMessageToBotStream(...)` com `conversationId` e `user_id`.
3. Frontend envia POST para `/chat/message/stream`.
4. Backend valida e inicia stream SSE.
5. Backend grava a mensagem do usuário e processa o chat com o orquestrador.
6. O orquestrador pode chamar funções de domínio (função, mesa, pedido, reserva, faturação).
7. O backend envia chunks `event: message` e o resultado final `event: done`.
8. O frontend atualiza a mensagem do bot dinamicamente e guarda o `conversationId`.
9. Se a resposta alterar o estado das mesas, o frontend usa `triggerTableRefresh()` para atualizar o admin.

## 10. Observações adicionais

- O token JWT é guardado em cookie e adicionado automaticamente pelos serviços via `api.js`.
- Apenas rotas sensíveis usam `verifyToken` / `requireRole` no backend.
- O chat público (`/message/stream` e `/history/conversation/:conversationId`) pode ser usado sem login.
- Limitação de 100 tokens por mensagem é válida para reduzir custos e controlar prompts.
