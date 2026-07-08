# Fluxo de Captura de Erros Backend → Frontend

## 1. Backend: erro antes do stream

Arquivo: [`backend/src/controllers/chatBotController.js`](../backend/src/controllers/chatBotController.js)

- Linha 26: valida `message`
  - retorna 400 se não houver mensagem
- Linha 44-48: valida limite de tokens com `checkMessageTokenLimit(message)`
  - usa `anthropic.messages.countTokens(...)`
  - devolve 400 se exceder `MAX_USER_MESSAGE_TOKENS`
- Linha 83 / 91: em qualquer exceção fora do stream, chama `writeSseError(res, err)`

## 2. Backend: erro durante o stream SSE

Arquivo: [`backend/src/utils/chatBotUtil.js`](../backend/src/utils/chatBotUtil.js)

- Linha 26: `writeSseError(res, err)` grava o evento SSE com:
  - `event: <tipo>` (por exemplo, `rate_limit`, `auth_error`)
  - `data: { success: false, errorType, message }`
- As categorias possíveis são definidas em `SSE_ERROR_EVENT`

## 3. Frontend: parsing do SSE e tratamento de erro

Arquivo: [`frontend/src/services/chatService.js`](../frontend/src/services/chatService.js)

- Linha 20: `sendMessageToBotStream(...)`
  - faz POST para `/chat/message/stream`
- Se `!response.ok` antes do stream:
  - tenta ler JSON do corpo
  - cria `onDone({ success: false, providerError: false, errorType, message })`
- No parser SSE:
  - trata eventos `provider_error`, `rate_limit`, `service_unavailable`, `auth_error`, `network_error`, `invalid_request`
  - evento `error` produz `success: false`, `providerError: false`
- No `catch` geral:
  - detecta `AbortError` ou `timeout`
  - devolve `TIMEOUT` ou `NETWORK_ERROR`
  - chama `onDone(...)` com mensagem amigável

## 4. Frontend: UI recebe erro via callbacks

Arquivo: [`frontend/src/components/chat/ChatUI.jsx`](../frontend/src/components/chat/ChatUI.jsx)

- Linha 109: `makeOnChunk(botMsgId)` atualiza texto incremental
- Linha 117: `makeOnDone(botMsgId)` trata payload final
  - guarda `conversationId` retornado
  - atualiza histórico e mensagens
  - se `payload?.success` for falso, define `providerError` no bot message

## 5. Principais diferenças

- Erros HTTP antes do stream são capturados no frontend antes da leitura SSE.
- Erros SSE são transmitidos como eventos especiais e o frontend decide se são "providerError" ou erro do servidor.
- O backend classifica erros de Claude e mapeia para eventos SSE via `writeSseError`.
