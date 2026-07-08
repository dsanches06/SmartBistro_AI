# Diagrama de Fluxo do Chatbot

## Visão geral

Este documento descreve o fluxo de mensagens do chatbot entre o frontend e o backend, incluindo autenticação, histórico de conversas, orquestração de funções e estado das mesas.

## 1. Frontend inicia o chat

1. Usuário digita mensagem no `ChatUI` ([`frontend/src/components/chat/ChatUI.jsx`](../frontend/src/components/chat/ChatUI.jsx)).
2. Chamadas principais:
   - `doSend(userMessage)`
   - `chatService.sendMessageToBotStream(...)` ([`frontend/src/services/chatService.js`](../frontend/src/services/chatService.js))
3. Payload enviado:
   - `message`
   - `conversationHistory`
   - `conversationId`
   - `user_id`
   - `customer_name`

## 2. Backend recebe o pedido

1. Rota: `POST /chat/message/stream` em `backend/src/routes/chatRoutes.js`.
2. Controlador: `sendMessageToBotStream(req, res)` em `backend/src/controllers/chatBotController.js`.
3. Validações:
   - `message` existente
   - limite de tokens por mensagem (`checkMessageTokenLimit`)
4. Configura headers SSE e inicia ping de keepalive.

## 3. Orquestração e função de ação

1. O backend chama `processChatStream(...)` em `backend/src/genai/orchestrations/chatBotProcessor.js`.
2. O orquestrador faz:
   - criação/recuperação de sessão por `conversationId`
   - carregamento do histórico de conversa da BD
   - execução do modelo com `function calling`
3. Funções disponíveis:
   - `find_or_create_user`
   - `get_table`
   - `submit_order`
   - `create_group_reservation`
   - `redeem_customer_points`
   - entre outras declaradas em `FUNCTION_HANDLERS`
4. O resultado pode incluir:
   - texto de resposta parcial
   - resultados de função (`functionResults`)

## 4. Resposta via SSE

1. O controller escreve eventos SSE:
   - `event: message` para chunks de texto parciais
   - `event: done` ao finalizar
2. No evento `done`, o payload inclui:
   - `success`
   - `conversationId`
   - `message`
   - `functionResults`
3. Em erro, usa `writeSseError(res, err)` em `backend/src/utils/chatBotUtil.js`.

## 5. Frontend processa o SSE

1. `sendMessageToBotStream` em `frontend/src/services/chatService.js` lê o stream.
2. Eventos tratados:
   - `message` → `onChunk(parsed.text)`
   - `done` → `onDone(parsed)`
   - `provider_error`, `rate_limit`, `service_unavailable`, `auth_error`, `network_error`, `invalid_request` → `onDone(..., providerError: true)`
   - `error` → `onDone(..., providerError: false)`
3. O `ChatUI` atualiza a mensagem do bot em tempo real e salva o `conversationId` final.

## 6. Histórico de conversas

1. O frontend recarrega o histórico com `chatService.getChatHistory(conversationId)`.
2. Endpoint: `GET /chat/history/conversation/:conversationId` em `backend/src/routes/chatRoutes.js`.
3. O histórico é renderizado no chat e usado para restaurar contexto.

## 7. Autenticação e token

1. Token armazenado em cookie por `AuthContext` (`frontend/src/context/AuthContext.jsx`).
2. Serviços `api.js` e `BaseService.js` incluem `Authorization: Bearer <token>` automaticamente.
3. Backend valida com `verifyToken` e `requireRole` em `backend/src/middlewares/authMiddleware.js`.
4. O chat público não exige token para `/message/stream` e `/history/conversation/:conversationId`.

## 8. Mesas e agrupamento

1. `TablePage.jsx` usa `tableService.createGroup(...)` e `tableService.dissolveGroup(...)`.
2. Funções do chatbot que alteram mesas acionam `triggerTableRefresh()` no frontend.
3. Mesas juntadas são criadas via endpoint `/tables/groups` e dissolvidas via `/tables/groups/:groupId`.

## 9. Diagrama simplificado

Frontend (ChatUI) → `POST /chat/message/stream` → Backend Chat Controller → Orquestrador → Modelo + Funções → SSE de volta → Frontend ChatUI

> Este fluxo cobre tanto o chat de utilizadores anónimos quanto o chat autenticado com `user_id` e histórico associado.
