# Explicação do Orquestrador e Agentes

## 1. Arquivo principal do orquestrador

Arquivo: [`backend/src/genai/orchestrations/chatBotProcessor.js`](../backend/src/genai/orchestrations/chatBotProcessor.js)

- Linha 31: importa `BaseChatProcessor` e prompts/configurações do chatbot.
- Linha 69-176: declarações de ferramentas (`ALL_DECLARATIONS`)
  - inclui funções como `get_table`, `update_table_status`, `submit_order`, `generate_invoice`, `create_reservation` e `create_group_reservation`
- Cada ferramenta exposta ao chatbot tem um `function declaration` e um handler em `FUNCTION_HANDLERS`

## 2. `FUNCTION_HANDLERS`

- `find_or_create_user`: identifica cliente e cria registo se necessário
- `get_user`: consulta dados do cliente
- `get_table`: procura mesa disponível ou sugere juntar mesas
- `submit_order`: passa pelo pipeline de pedidos e cria pedido na BD
- `create_group_reservation`: cria reserva para grupo e marca mesas como `Reserved`
- `redeem_customer_points`: calcula desconto e devolve saldo

## 3. Sessões de conversa

- Linha 353: o backend mantém `sessions` num `Map` por `conversationId`
- Linha 357-364: `getOrCreateSession(conversationId, customerName)`
  - se houver sessão ativa, reutiliza-a
  - caso contrário, cria `SmartBistroChatProcessor`
  - carrega histórico com `getChatHistoryByConversationId(conversationId)`
- Linha 373: guarda sessão em memória com `sessions.set(conversationId, processor)`

## 4. Processamento de chat

- Linha 381: `processChatStream(message, conversationId, { onChunk, onDone, onError }, customerName)`
  - recupera/ cria sessão
  - chama `processor.chat(message, onChunk)`
  - `onDone(result.message || '', result.functionResults ?? [])`
  - em erro, classifica com `classifyClaudeError(err)` e chama `onError`

## 5. Function calling e Claude

- O orquestrador usa ferramentas para responder com capacidade de `function call`.
- Quando Claude decide chamar uma função, o resultado chega ao backend via `FUNCTION_HANDLERS`.
- O backend transforma o resultado em `functionResults` e envia ao frontend no evento SSE final.

## 6. Limite de 100 tokens por mensagem

Arquivo: [`backend/src/controllers/chatBotController.js`](../backend/src/controllers/chatBotController.js)

- Linha 44-48: `checkMessageTokenLimit(message)`
  - usa `anthropic.messages.countTokens(...)`
  - compara `input_tokens` com `MAX_USER_MESSAGE_TOKENS`
  - retorna erro de validação se a mensagem for muito longa

## 7. Resumo do papel do orquestrador

- Recebe texto do utilizador
- Reconstitui contexto com histórico de conversa
- Oferece acesso a funções de domínio (mesas, pedidos, reservas, faturação)
- Decide quando chamar ferramentas em vez de responder apenas em texto
- Retorna texto parcial via SSE e resultados de função no fim
