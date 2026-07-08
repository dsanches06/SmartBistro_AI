# Fluxo Chatbot Frontend → Backend

## 1. Frontend: envio do chat

Arquivo: [`frontend/src/components/chat/ChatUI.jsx`](../frontend/src/components/chat/ChatUI.jsx)

- Linha 34-35: estados principais
  - `conversationHistory` (histórico de mensagens locais)
  - `conversationId` (ID da conversa atual)
- Linha 190-211: função `doSend(userMessage)`
  - monta `updatedHistory` com o novo texto do utilizador
  - chama `chatService.sendMessageToBotStream(...)`
  - passa `user?.id ?? null` como `user_id`
  - passa `conversationId` existente, se houver
  - passa `customerName` como `customer_name`

## 2. Frontend: serviço de chat

Arquivo: [`frontend/src/services/chatService.js`](../frontend/src/services/chatService.js)

- Linha 20: método `sendMessageToBotStream(...)`
  - recebe `message`, `conversationHistory`, `onChunk`, `onDone`, `conversationId`, `user_id`, `customer_name`
  - constrói payload JSON:
    - `message`
    - `conversationHistory`
    - `conversationId`
    - `user_id`
    - `customer_name`
- Linha 167: método `sendMessageToConversation(conversationId, message)` para rota não-stream
- Linha 291: método `getChatHistory(conversationId)`
  - chama `GET /chat/history/conversation/${conversationId}`

## 3. Frontend: seleção e carga de histórico

Arquivo: [`frontend/src/components/chat/ChatUI.jsx`](../frontend/src/components/chat/ChatUI.jsx)

- Linha 67-78: `handleSelectConversation(conv)`
  - define `conversationId` com `conv.id`
  - chama `chatService.getChatHistory(conv.id)`
  - converte resultados para o formato usado pelo chat
  - atualiza `conversationHistory` e `messages`
- Linha 99-102: `handleNewConversation()` limpa a conversa atual e começa nova

## 4. Backend: rotas de chat

Arquivo: [`backend/src/routes/chatRoutes.js`](../backend/src/routes/chatRoutes.js)

- Linha 9-11: `POST /chat/message/stream`
  - usa `chatBotController.sendMessageToBotStream`
- Linha 18: `POST /chat/conversation/:conversationId/message`
  - usa `chatBotController.sendMessageToConversation`
- Linha 23: `GET /chat/history/conversation/:conversationId`
  - rota pública para recuperar histórico de conversa

## 5. Backend: controlador do chatbot

Arquivo: [`backend/src/controllers/chatBotController.js`](../backend/src/controllers/chatBotController.js)

- Linha 26: `sendMessageToBotStream(req, res)`
  - valida `message`
  - configura cabeçalhos SSE
  - envia `ping` a cada 20s
- Linha 44-46: cria conversa nova se `conversationId` estiver ausente
- Linha 52: escreve mensagem do utilizador no histórico com `ROLE_USER`
- Linha 56: chama `processChatStream(...)`
- Linha 67: escreve resposta final e retorna evento SSE `done`
  - inclui `success`, `conversationId`, `message`, `functionResults`
- Linha 83: em erro, escreve evento SSE de erro com `writeSseError(res, err)`

## 6. Backend: histórico de chat

- O histórico de chat é guardado no backend via `createChatHistory(...)` em `chatBotController.js`
- A rota pública `GET /chat/history/conversation/:conversationId` devolve o histórico para o frontend recarregar a conversa

## 7. Principais pontos do fluxo

1. O utilizador envia mensagem no `ChatUI.jsx`.
2. O frontend chama `chatService.sendMessageToBotStream(...)`.
3. O backend recebe o POST em `/chat/message/stream`.
4. O backend cria ou reutiliza `conversationId` e grava a mensagem do utilizador.
5. O backend processa o chat com `processChatStream(...)`.
6. O backend envia eventos SSE incrementalmente com `event: message` e, no fim, `event: done`.
7. O frontend atualiza a interface a cada chunk e trata o resultado final.
