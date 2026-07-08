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

## 5. Claude e o loop de agentes

- O orquestrador baseia-se em `backend/src/genai/models/BaseChatProcessor.js`.
- Historico é convertido para o formato Claude com `role` + `content`.
- `BaseChatProcessor._callClaude(...)` chama `callClaude(...)` com `tools` normalizados e temperatura `0.3`.
- `BaseChatProcessor._streamRound(...)` abre um stream `anthropic.messages.stream(...)` e envia chunks de texto a `onChunk`.
- O resultado de cada ronda pode incluir `functionCalls` extraídas de `assistantMsg.content`.
- Cada `functionCall` é executada por `executeFunction(functionCall)`:
  - analisa `name` e `args`
  - encontra o handler em `FUNCTION_HANDLERS`
  - retorna `{ name, args, result, functionCall }`
- Após executar as funções, o resultado é reencaminhado como mensagem `tool_result` ao Claude para permitir a próxima ronda.
- O loop repete enquanto existirem `functionCalls` e o número de passagens for menor que `MAX_AGENTIC_STEPS` (5).
- `filterFunctionCalls(...)` limpa funções redundantes quando necessário, por exemplo `set_assign_task_values`.
- Em modo stream, se Claude não devolver texto e não houver chunks, o sistema força continuação com prompt adicional para avançar.
- No fim, o processor retorna `message` e `functionResults`, que são enviados no evento SSE `done`.

## 6. Function calling e Claude

- O orquestrador usa ferramentas para responder com capacidade de `function call`.
- Quando Claude decide chamar uma função, o resultado chega ao backend via `FUNCTION_HANDLERS`.
- O backend transforma o resultado em `functionResults` e envia ao frontend no evento SSE final.

## 7. Limite de 100 tokens por mensagem

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
