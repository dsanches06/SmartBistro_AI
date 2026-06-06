# SmartBistro AI — Documentação do Backend

> Guia técnico para preparação da defesa de projecto.
> Cobre: Controllers, GenAI (agentes, orchestrators, config), Middleware e Utils.

---

## Índice

1. [Visão Geral da Arquitectura](#1-visão-geral-da-arquitectura)
2. [Controllers](#2-controllers)
   - [AuthController](#21-authcontroller)
   - [ChatbotController](#22-chatbotcontroller)
   - [OrderPipelineController](#23-orderpipelinecontroller)
   - [KDSController](#24-kdscontroller)
3. [GenAI — Inteligência Artificial](#3-genai--inteligência-artificial)
   - [Modelo Base: BaseAgentAI](#31-modelo-base-baseagentai)
   - [Os Três Agentes](#32-os-três-agentes)
   - [Order Orchestrator — Pipeline de 3 Agentes](#33-order-orchestrator--pipeline-de-3-agentes)
   - [Chatbot Processor — Loop Agêntico com Streaming](#34-chatbot-processor--loop-agêntico-com-streaming)
   - [Config Groq — Fallback de Modelos](#35-config-groq--fallback-de-modelos)
   - [System Prompts](#36-system-prompts)
   - [Functions (Function Calling)](#37-functions-function-calling)
   - [Helpers JSON](#38-helpers-json)
4. [Middleware](#4-middleware)
5. [Utils](#5-utils)
   - [groqUtil — Normalização e Streaming](#51-groqutil--normalização-e-streaming)
   - [thinkingBotUtil — Reasoning com Groq](#52-thinkingbotutil--reasoning-com-groq)
   - [financialUtil — Cálculos Financeiros](#53-financialutil--cálculos-financeiros)
   - [classifyError — Erros Amigáveis](#54-classifyerror--erros-amigáveis)
   - [Outros Utils](#55-outros-utils)
6. [Fluxos Completos](#6-fluxos-completos)

---

## 1. Visão Geral da Arquitectura

```
Cliente (React) ──HTTP/SSE──▶ Express Router
                                    │
                          ┌─────────┼──────────────┐
                          ▼         ▼              ▼
                    AuthController  ChatbotCtrl  OrderPipelineCtrl
                                        │              │
                                    GenAI Layer    GenAI Layer
                                   (Chatbot)      (3-Agent Pipeline)
                                        │              │
                                    Groq API ◀────────┘
                                   (fallback queue)
                                        │
                                   MySQL (BD)
```

**Tecnologias chave:**
| Camada | Tecnologia |
|--------|-----------|
| HTTP Server | Express.js |
| Base de Dados | MySQL (pool de conexões) |
| IA / LLM | Groq SDK (llama-3.3-70b + fallbacks) |
| Auth | JWT (jsonwebtoken) + bcrypt |
| Streaming | SSE (Server-Sent Events) |
| Validação de schemas | Zod |

---

## 2. Controllers

### 2.1 AuthController

**Ficheiro:** `backend/src/controllers/authController.js`

Gere o registo, login, logout e eliminação de contas. Usa JWT para sessões e bcrypt para passwords.

#### Endpoints e lógica

| Endpoint | Função | O que faz |
|----------|--------|-----------|
| `POST /auth/register` | `register` | Cria conta — liga a cliente existente se houver match por nome/email/telefone |
| `POST /auth/login` | `login` | Autentica username + password; devolve JWT de 8h |
| `POST /auth/logout` | `logout` | Marca cliente como `active = false` na BD |
| `POST /auth/request-delete` | `requestDelete` | Envia notificação a todos os admins activos |
| `GET /auth/me` | `me` | Devolve dados do utilizador autenticado |

#### Padrão de token

`backend/src/controllers/authController.js` — linhas 7–13
```js
function signToken(user) {
  return jwt.sign(
    { id: user.id, role_id: user.role_id },
    process.env.JWT_SECRET,
    { expiresIn: '8h' },
  );
}
```

O token guarda apenas `id` e `role_id` — nunca passwords nem dados sensíveis.

#### Lógica de registo (detalhe importante para a defesa)

O registo tem uma lógica de **ligação inteligente**: se já existir um cliente (`customers`) com o mesmo nome, email ou telefone mas sem conta (`auth_accounts`), a nova conta é ligada a esse cliente em vez de criar um duplicado. Isto garante que clientes criados pelo Maître AI ficam ligados à conta que criam depois.

```
Registo recebido
      │
      ▼
Verifica se username já existe em auth_accounts
      │ não existe
      ▼
Procura cliente por phone OR email OR name
      │                    │
   encontrou           não encontrou
      │                    │
Tem auth_account?      Cria novo customer
   │          │               │
  sim        não              ▼
   │          ▼         Cria auth_account
  409      Liga conta    Devolve JWT (201)
           existente
           Devolve JWT (200, linked=true)
```

---

### 2.2 ChatbotController

**Ficheiro:** `backend/src/controllers/chatBotController.js`

Serve de ponte entre o cliente React e o motor de chatbot em `genai/`. Usa **SSE (Server-Sent Events)** para fazer streaming em tempo real do texto gerado pelo LLM.

#### Endpoints

| Endpoint | Função | O que faz |
|----------|--------|-----------|
| `POST /chatbot/stream` | `sendMessageToBotStream` | Streaming SSE — resposta em tempo real |
| `POST /chatbot/conversation/:id` | `sendMessageToConversation` | Adiciona mensagem a conversa sem stream |

#### Fluxo do streaming SSE

```
Cliente envia POST { message, conversationId?, customer_id }
                │
                ▼
    Abre conexão SSE (Content-Type: text/event-stream)
    Inicia ping a cada 20s (evita timeout do browser)
                │
                ▼
    Cria conversa se não existir (BD)
    Persiste mensagem do utilizador
                │
                ▼
    processChatStream(message, convId, callbacks)
        ├── onChunk(text) ──▶ SSE: event: message \n data: {"text": "..."}
        ├── onDone(_, fns) ──▶ persiste resposta + SSE: event: done
        └── onError(err) ───▶ SSE: event: error
```

`backend/src/controllers/chatBotController.js` — linhas 35–52
```js
// Cada fragmento de texto enviado ao cliente:
res.write(`event: message\ndata: ${JSON.stringify({ text })}\n\n`);

// Quando termina:
res.write(`event: done\ndata: ${JSON.stringify({
  success: true,
  conversationId: convId,
  message: fullText,
  functionResults: [...],
})}\n\n`);
```

**Ponto chave para a defesa:** O SSE permite que o utilizador veja o texto a ser escrito palavra a palavra, como num chat real — sem esperar pela resposta completa.

---

### 2.3 OrderPipelineController

**Ficheiro:** `backend/src/controllers/orderPipelineController.js`

O controller mais complexo do sistema. Recebe um **pedido em linguagem natural** e executa o **pipeline de 3 agentes AI** para transformar esse texto num pedido real na BD, com fatura e pagamento.

#### Endpoint

`POST /orders/pipeline`

#### Corpo do pedido esperado

```json
{
  "customer_name": "João",
  "customer_surname": "Silva",
  "phone": "912345678",
  "message": "eu e a minha esposa queremos jantar, esparguete e hamburguer",
  "payment_method": "MB Way",
  "tax_rate": 0.13,
  "discount": 0,
  "discount_type": "percent"
}
```

#### Fluxo sequencial (o que acontece dentro do controller)

```
1. Validação dos campos obrigatórios (customer_name + message)
        │
        ▼
2. runOrderPipeline(orderData)  ◀── GenAI: 3 agentes em sequência
        │   devolve: { validated, sequenced, financials, final }
        ▼
3. findOrCreateCustomer(nome, telefone)  ◀── BD: upsert de cliente
        │
        ▼
4. Verificar itens indisponíveis (stock_status do Chefe)
   Se houver → devolve 400 com lista de itens em falta
        │
        ▼
5. Normalizar service_type → "Table" ou "Takeaway"
   Se Table → validar table_id atribuído pelo Maître
        │
        ▼
6. createOrder(...)          ◀── BD: INSERT na tabela orders
7. createOrderItem(...)×N    ◀── BD: INSERT por item (em paralelo)
8. createInvoice(...)        ◀── BD: totais calculados em JS (nunca IA)
9. createPayment(...)        ◀── BD: registo de pagamento pendente
10. updateTableStatus(Occupied) ◀── BD: mesa marcada como ocupada
        │
        ▼
11. Devolve 201 com order, invoice, payment e dados do pipeline
```

**Princípio fundamental:** Os valores financeiros (subtotal, IVA, total) são **sempre calculados por funções JS puras** (`calculateInvoiceTotals`) — nunca pelo modelo de IA, que pode alucinar números.

#### Tratamento de erros por stage

O controller classifica erros por origem para dar mensagens úteis:

| Stage | HTTP | Causa |
|-------|------|-------|
| `maitre_validation` | 400 | Maître não reconheceu os itens |
| `stock_retry_failed` | 409 | Não foi possível ajustar pedido após falta de stock |
| `agent_validation` | 502 | Resposta do LLM não passou validação Zod |
| `json_extraction` | 502 | Resposta do LLM não é JSON válido |
| `external_ai` (rate limit) | 429 | Groq com demasiados pedidos |
| `external_ai` (down) | 503 | Groq indisponível |

---

### 2.4 KDSController

**Ficheiro:** `backend/src/controllers/kdsController.js`

KDS = **Kitchen Display System**. Este controller é invocado quando o staff da cozinha quer iniciar a preparação de um pedido. Usa o **Chef AI** diretamente (sem pipeline completo) para gerar a sequência de preparação.

#### Endpoint

`POST /orders/:id/chef-start`

#### Fluxo

```
1. Valida ID e estado do pedido (deve estar "Pending")
        │
        ▼
2. Carrega itens do pedido + menu activo (em paralelo)
        │
        ▼
3. Constrói input para o Chef AI
        │
        ▼
4. Chef AI analisa e devolve:
   - kitchen_sequence (ordem de preparação)
   - estimated_seconds (tempo estimado)
   - stock_status
   - sections (por secção da cozinha)
        │
        ▼
5. updateOrder(orderId, { order_status: "In Preparation", kitchen_sequence_json })
        │
        ▼
6. Devolve resposta com sequência e tempo (clampado entre 10s e 120s)
```

`backend/src/controllers/kdsController.js` — linha 85
```js
// Clamp do tempo (Chef tende a retornar tempos irrealistas):
const estimatedSeconds = Math.min(Math.max(Number(sequenced.estimated_seconds ?? 30), 10), 120);
```

**Para a defesa:** O KDS usa o mesmo Chef AI do pipeline mas de forma isolada — ideal para pedidos que já existem na BD e precisam de ser iniciados manualmente pelo staff.

### Fallback para pedidos do carrinho digital

Pedidos criados pelo carrinho da MainPage **não passam pelo Chef AI** — chegam directamente como `"In Preparation"` com `kitchen_sequence_json` já preenchido. Se o `chef-start` for chamado para um pedido sem `order_items` na DB:

```js
// kdsController.js — fallback quando não há order_items
if (!itemsWithDetails.length) {
  // Analisa kitchen_sequence_json directamente (formato do carrinho)
  const kitchenSeq = JSON.parse(order.kitchen_sequence_json); // [{name, quantity, price}]
  await updateOrder(orderId, { order_status: 'In Preparation' });
  return res.json({ success: true, estimated_seconds: 60, kitchen_sequence: kitchenSeq });
}
```

### Criação automática de fatura e notificação ao mudar para "Ready"

**Ficheiro:** `backend/src/controllers/orderController.js` — `updateStatus`

Quando `PATCH /orders/:id/status` recebe `order_status: "Ready"`:

```js
if (order_status === 'Ready') {
  const alreadyExists = await invoiceExistsForOrder(orderId);
  if (!alreadyExists) {
    const order = await getOrderById(orderId);
    const items = JSON.parse(order.kitchen_sequence_json); // [{name, quantity, price}]
    const { subtotal, taxAmount, total } = calculateInvoiceTotals({ items });
    await createInvoice({ order_id, subtotal_amount, tax_amount, total_amount, profit_margin: total });

    // Notifica o cliente para efectuar o pagamento
    if (order.customer_id) {
      await createNotification({
        customer_id: order.customer_id,
        title: 'Pedido pronto — pagamento pendente',
        message: `O teu pedido #${orderId} está pronto. Total a pagar: ${total.toFixed(2)} €.`,
      });
    }
  }
}
```

**Para a defesa:** A fatura e a notificação são criadas automaticamente pelo backend sem intervenção do staff. O cliente é notificado em tempo real (bell no header faz polling de 30s).

---

## 3. GenAI — Inteligência Artificial

Toda a lógica de IA está em `backend/src/genai/` e divide-se em:

```
genai/
├── agents/          ← Os 3 agentes (Maître, Chef, Manager) + mensagens e helpers
├── models/          ← BaseAgentAI + BaseChatProcessor
├── orchestrations/  ← orderOrchestrator + chatBotProcessor
├── config/          ← groq.js (cliente + fallback) + systemPrompt.js
├── functions/       ← 19 funções para o chatbot (function calling)
└── helpers/         ← jsonHelpers.js (extracção + validação JSON)
```

---

### 3.1 Modelo Base: BaseAgentAI

**Ficheiro:** `backend/src/genai/models/BaseAgentAI.js`

Superclasse de todos os agentes. Abstrai a chamada Groq, o histórico de conversação e o raciocínio.

`backend/src/genai/models/BaseAgentAI.js` — linhas 14–92
```js
class BaseAgentAI {
  constructor(name, instruction, temperature = 0.25, tools = null, thinking = false) {
    this._messages = [{ role: "system", content: instruction }];
    // ...
  }

  async sendMessage(message) {
    // Chama chatWithFallback → normaliza resposta → devolve texto
  }

  async sendMessageWithThoughts(message) {
    // Como sendMessage mas também devolve o reasoning do modelo
    return { text, thoughts };
  }
}
```

**Multi-turn:** Cada chamada a `sendMessage` acrescenta o par user/assistant ao `_messages`. Isto permite que o Maître receba feedback de stock do Chefe e ajuste o pedido sem perder contexto.

---

### 3.2 Os Três Agentes

Cada agente extende `BaseAgentAI` com um system prompt e temperatura próprios:

| Agente | Ficheiro | Temperatura | Reasoning | Papel |
|--------|----------|-------------|-----------|-------|
| `MaitreAgent` | `agents/maitre/MaitreAgent.js` | **0.4** (médio) | Equilibrado | Interpreta linguagem natural → JSON estruturado |
| `ChefAgent` | `agents/chef/ChefAgent.js` | **0.2** (baixo) | Preciso | Verifica stock, cria sequência de cozinha |
| `ManagerAgent` | `agents/manager/ManagerAgent.js` | **0.3** (baixo) | Preciso | Confirma fatura com dados pré-calculados |

**Porquê temperaturas diferentes?**
- Maître: precisa de criatividade para interpretar pedidos vagos como "quero qualquer coisa leve"
- Chef e Manager: tarefas técnicas que exigem determinismo — stock é 0 ou não é, os números não podem variar

---

### 3.3 Order Orchestrator — Pipeline de 3 Agentes

**Ficheiro:** `backend/src/genai/orchestrations/orderOrchestrator.js`

Este é o coração da funcionalidade principal do SmartBistro. Coordena os 3 agentes em sequência.

#### Diagrama completo do pipeline

```
Input: { customer_name, message, tax_rate, discount, ... }
           │
           ▼
  [BD] getAllTables("Available") + getActiveItems()
           │
           ▼
┌─────────────────────────────────────────────────────────┐
│  FASE 1 — Maître (temperatura 0.4)                      │
│  Recebe: mensagem + mesas disponíveis + menu activo     │
│  Devolve JSON:                                          │
│  {                                                      │
│    table_id: 3,                                         │
│    service_type: "Table",                               │
│    items: [{ item_id, name, quantity, price }],         │
│    validation_status: "valid",                          │
│    allergy_restrictions: null                           │
│  }                                                      │
└─────────────────────────────────────────────────────────┘
           │
           │  enforceMenuPrices() — corrige preços pelo menu real
           ▼
┌─────────────────────────────────────────────────────────┐
│  FASE 2 — Chef (temperatura 0.2)                        │
│  Recebe: output do Maître + menu activo                 │
│  Devolve JSON:                                          │
│  {                                                      │
│    kitchen_sequence: ["Esparguete", "Hamburguer"],      │
│    estimated_seconds: 25,                               │
│    stock_status: "ok" | "warning" | "critical",        │
│    stock_alerts: [...],                                 │
│    items: [{ ...item, unavailable: false }]             │
│  }                                                      │
└─────────────────────────────────────────────────────────┘
           │
           │  Se houver itens indisponíveis:
           │  ┌─── Feedback ao Maître (buildMaitreStockFeedbackMessage)
           │  │    Maître ajusta itens → Chef valida novamente
           │  │    Se ainda indisponível → PipelineError
           │  └───────────────────────────────────────────
           │
           │  calculateInvoiceTotals() em JS puro
           ▼
┌─────────────────────────────────────────────────────────┐
│  FASE 3 — Manager (temperatura 0.3)                     │
│  Recebe: validated + sequenced + financials             │
│  Os totais chegam PRÉ-CALCULADOS — Manager só confirma  │
│  Devolve JSON:                                          │
│  {                                                      │
│    success: true,                                       │
│    invoice: { subtotal, tax, total },                   │
│    notes: "Pedido confirmado"                           │
│  }                                                      │
└─────────────────────────────────────────────────────────┘
           │
           ▼
  Devolve: { validated, sequenced, financials, final }
```

#### Loop de correcção de stock

`backend/src/genai/orchestrations/orderOrchestrator.js` — linhas 114–177
```js
if (unavailableItems.length > 0) {
  // Maître recebe lista de itens em falta + menu disponível
  const retryText = await maitre.sendMessage(
    buildMaitreStockFeedbackMessage(validated, availableTables, menuItems, sequenced)
  );
  // Chef valida o pedido ajustado
  // Se ainda há indisponíveis → PipelineError
}
```

---

### 3.4 Chatbot Processor — Loop Agêntico com Streaming

**Ficheiro:** `backend/src/genai/orchestrations/chatBotProcessor.js`

O chatbot funciona de forma diferente do pipeline: usa **function calling** para interagir com a BD em tempo real enquanto conversa.

#### Loop agêntico (até 5 iterações)

```
Utilizador: "Quero fazer uma reserva para amanhã às 20h"
                │
                ▼
        LLM decide chamar get_tables()
                │
                ▼
        Sistema executa get_tables() na BD
        Devolve lista de mesas disponíveis
                │
                ▼
        LLM recebe resultado + decide chamar create_reservation()
                │
                ▼
        Sistema executa create_reservation()
                │
                ▼
        LLM formula resposta final em português
        "A sua reserva foi criada para amanhã às 20h, mesa 4."
                │
                ▼
        Streaming SSE → cliente recebe texto em tempo real
```

#### As 19 funções disponíveis para o chatbot

O chatbot pode chamar estas funções durante a conversa:

| Categoria | Funções |
|-----------|---------|
| Clientes | `get_customer`, `create_customer`, `find_or_create_customer` |
| Mesas | `get_tables`, `update_table_status` |
| Menu | `get_items`, `get_active_items` |
| Pedidos | `create_order`, `update_order_status` |
| Itens de pedido | `create_order_item` |
| Facturas | `create_invoice`, `calculate_invoice_totals` |
| Pagamentos | `create_payment`, `update_payment_status` |
| Stock | `get_stock`, `adjust_stock` |
| Reservas | `get_reservations`, `create_reservation`, `cancel_reservation` |
| Notificações | `create_notification` |

#### Sessões por conversa

`backend/src/genai/orchestrations/chatBotProcessor.js` — linhas 223–266
```js
// Cada conversa tem o seu próprio chat session (histórico isolado)
class SmartBistroChatProcessor extends BaseChatProcessor {
  constructor() {
    this._sessions = new Map(); // conversationId → groqChatSession
  }

  _getOrCreateSession(convId) {
    if (!this._sessions.has(convId)) {
      this._sessions.set(convId, createGroqChat(TOOLS, CHATBOT_SYSTEM_PROMPT, history));
    }
    return this._sessions.get(convId);
  }
}
```

---

### 3.5 Config Groq — Fallback de Modelos

**Ficheiro:** `backend/src/genai/config/groq.js`

O sistema nunca depende de um único modelo. Se o modelo principal falhar, tenta automaticamente o próximo na fila.

#### Fila de fallback

`backend/src/genai/config/groq.js` — linhas 43–46
```js
const GROQ_MODEL_QUEUE = [
  "llama-3.3-70b-versatile",    // modelo principal (configurável via .env)
  "openai/gpt-oss-120b",         // OpenAI reasoning — máxima capacidade
  "openai/gpt-oss-20b",          // OpenAI reasoning — rápido
  "meta-llama/llama-4-scout-17b-16e-instruct",
  "qwen/qwen3-32b",              // Qwen3 com <think>
  "groq/compound",
  "llama-3.1-8b-instant",
  "groq/compound-mini",          // último recurso
];
```

#### Lógica de fallback recursiva

`backend/src/genai/config/groq.js` — linhas 54–95
```js
async function chatWithFallback(messages, options, queue, idx = 0) {
  if (idx >= queue.length) throw new Error("Todos os modelos indisponíveis");

  try {
    const response = await groq.chat.completions.create({ model: queue[idx], ...options });
    return response;
  } catch (error) {
    if (isRetryableGroqError(error) && idx < queue.length - 1) {
      // 429, 502, 503, timeout → tenta próximo modelo
      return chatWithFallback(messages, options, queue, idx + 1);
    }
    throw error;
  }
}
```

**Para a defesa:** Isto garante alta disponibilidade — mesmo que o Groq esteja sobrecarregado, o sistema tenta automaticamente outros modelos sem o utilizador perceber.

---

### 3.6 System Prompts

**Ficheiro:** `backend/src/genai/config/systemPrompt.js`

Cada agente tem um system prompt com instruções detalhadas:

| Prompt | Para quem | Instrução principal |
|--------|-----------|---------------------|
| `CHATBOT_SYSTEM_PROMPT` | ChatBot | Conversação em PT, fluxo de pedido, verificação de stock, pagamentos |
| `MAITRE_PROMPT` | MaitreAgent | Responde APENAS em JSON válido, mapeia itens ao menu, selecciona mesa |
| `CHEF_PROMPT` | ChefAgent | JSON de sequência de cozinha, verifica stock, estima tempo |
| `MANAGER_PROMPT` | ManagerAgent | Confirma fatura com dados recebidos, nunca calcula valores |

O `CHATBOT_SYSTEM_PROMPT` é o maior (~7000 tokens) e define o fluxo completo de atendimento:
- Saudar → Tomar pedido → Verificar stock → Confirmar → Pagamento → Despedida

---

### 3.7 Functions (Function Calling)

**Pasta:** `backend/src/genai/functions/`

Cada categoria tem dois ficheiros:
- `declarations.js` — define o schema da função (nome, parâmetros, descrição) para o LLM
- `implementations.js` — código JS que executa a operação real na BD

**Exemplo — reservas:**

`backend/src/genai/functions/reservations/declarations.js` — declaração da função
`backend/src/genai/functions/reservations/implementations.js` — implementação
```js
// declarations.js
export const createReservationDeclaration = {
  name: "create_reservation",
  description: "Cria uma reserva para um cliente",
  parameters: {
    type: "object",
    properties: {
      customer_id: { type: "number" },
      table_id:    { type: "number" },
      date:        { type: "string", description: "ISO 8601" },
      guests:      { type: "number" },
    },
    required: ["customer_id", "table_id", "date", "guests"]
  }
};

// implementations.js
export async function createReservation({ customer_id, table_id, date, guests }) {
  return db.query("INSERT INTO reservations ...", [...]);
}
```

O chatbot escolhe qual função chamar, o sistema executa e devolve o resultado ao LLM para formular a resposta.

---

### 3.8 Helpers JSON

**Ficheiro:** `backend/src/genai/helpers/jsonHelpers.js`

Os LLMs por vezes devolvem JSON mal formado (brackets em falta, texto extra antes do `{`). Este helper corrige isso.

`backend/src/genai/helpers/jsonHelpers.js` — linhas 1–116
```js
// Extrai JSON de uma string com texto à volta
extractJSON(rawText, agentName)
  // → tenta JSON.parse directo
  // → se falhar, procura o primeiro { ou [ e extrai
  // → repara brackets em falta com repairBrackets()

// Valida contra schema Zod
validateAgentOutput(schema, data, agentName)
  // → se falhar → PipelineError com detalhes do erro Zod
```

---

## 4. Middleware

**Pasta:** `backend/src/middlewares/`

### authMiddleware.js

Dois middlewares de protecção de rotas:

`backend/src/middlewares/authMiddleware.js` — linhas 3–24
```js
// Verifica JWT no header Authorization: Bearer <token>
export function verifyToken(req, res, next) {
  const token = req.headers['authorization']?.slice(7);
  req.user = jwt.verify(token, process.env.JWT_SECRET); // { id, role_id }
  next();
}

// Controlo de acesso por role
export function requireRole(...roles) {
  return (req, res, next) => {
    if (!roles.includes(req.user?.role_id)) return res.status(403).json(...);
    next();
  };
}
```

**Roles no sistema:**
- `role_id: 1` → Admin (acesso total)
- `role_id: 2` → Cliente (acesso limitado)

**Exemplo de uso nas rotas:**
```js
router.get('/admin/users', verifyToken, requireRole(1), getAllUsers);
router.get('/me', verifyToken, getProfile);
```

### createExistsMiddleware.js

Factory que cria middlewares de validação de existência para qualquer entidade:

`backend/src/middlewares/createExistsMiddleware.js` — linhas 1–32
```js
// Cria middleware que verifica se o recurso existe antes de continuar
const orderExists = createExistsMiddleware(getOrderById, 'Order');

router.put('/orders/:id', orderExists, updateOrder);
// Se order não existir → 404 automático
```

Evita repetir verificações de existência em cada controller.

### loggerMiddleware.js

```js
// Log de cada pedido HTTP: "GET /orders/5"
app.use((req, _, next) => { console.log(`${req.method} ${req.url}`); next(); });
```

---

## 5. Utils

**Pasta:** `backend/src/utils/`

### 5.1 groqUtil — Normalização e Streaming

**Ficheiro:** `backend/src/utils/groqUtil.js`

#### extractThinking — separa o raciocínio do texto visível

Alguns modelos (Qwen3, modelos OpenAI com reasoning) devolvem o seu raciocínio dentro de tags `<think>`:

```
<think>
O utilizador quer esparguete. Preciso verificar se está no menu...
Sim, está. Preço: €12.50. Mesa 3 está disponível.
</think>

Claro! Esparguete à Bolonhesa para a mesa 3. Posso confirmar o seu pedido?
```

`backend/src/utils/groqUtil.js` — linhas 87–96
```js
export function extractThinking(rawText) {
  const thoughts = [];
  const text = rawText.replace(/<think>([\s\S]*?)<\/think>/gi, (_, c) => {
    thoughts.push(c.trim());
    return ""; // remove do texto visível
  }).trim();
  return { text, thinking: thoughts.join("\n\n") || null };
}
```

O utilizador só vê `text`; o `thinking` fica disponível para debug/logging.

#### createThinkTagFilter — filtra tags durante streaming

No streaming, o texto chega fragmento a fragmento. O filtro acumula buffer e só emite texto fora das tags `<think>`:

`backend/src/utils/groqUtil.js` — linhas 142–193
```js
const filter = createThinkTagFilter(onChunk);
filter.feed("<thi");    // acumula no buffer
filter.feed("nk>Hmm");  // detecta abertura de tag, suspende emissão
filter.feed("</think>Olá!"); // detecta fecho, emite "Olá!"
const thoughts = filter.finalize();
```

#### isRetryableGroqError — decide se deve tentar próximo modelo

`backend/src/utils/groqUtil.js` — linhas 4–22
```js
// Erros temporários → tentar próximo modelo
status === 429 ||  // rate limit
status === 502 ||  // bad gateway
status === 503 ||  // service unavailable
msg.includes("timeout") || msg.includes("overloaded")
```

---

### 5.2 thinkingBotUtil — Reasoning com Groq

**Ficheiro:** `backend/src/utils/thinkingBotUtil.js`

#### Como funciona o "thinking" no SmartBistro

O Groq suporta dois mecanismos de raciocínio:

1. **`reasoning_effort`** (modelos `openai/*`): parâmetro da API (`low | medium | high`)
2. **`<think>` tags** (modelos Qwen, alguns Llama): o modelo escreve o raciocínio no próprio texto

`backend/src/utils/thinkingBotUtil.js` — linhas 8–13
```js
// Temperatura → nível de raciocínio
export function getThinkingLevel(temp) {
  if (temp <= 0.3) return "low";    // Agentes precisos (Chef, Manager)
  if (temp <= 0.7) return "medium"; // Maître (interpretação)
  return "high";                    // Tarefas criativas
}
```

**Mapeamento completo:**
| Agente | Temperatura | reasoning_effort |
|--------|-------------|-----------------|
| ChefAgent | 0.2 | `low` |
| ManagerAgent | 0.3 | `low` |
| MaitreAgent | 0.4 | `medium` |
| ChatBot | 0.3 | `low` (configurável por env) |

**Para a defesa:** O sistema usa `reasoning_effort` apenas nos modelos OpenAI (detectado por `model.startsWith("openai/")`). Nos outros modelos, o raciocínio é extraído das tags `<think>` se existirem. Isto é transparente para o código de negócio.

`backend/src/genai/models/BaseAgentAI.js` — linhas 34–37
`backend/src/genai/config/groq.js` — linhas 70–73
```js
// Em BaseAgentAI:
_reasoningOptions() {
  if (!this.thinking) return {};
  return { reasoning_effort: getThinkingLevel(this.temperature) };
}

// Em chatWithFallback:
const extraOpts = reasoning_effort && supportsReasoningEffort(model)
  ? { reasoning_effort }
  : {}; // ignora silenciosamente para modelos incompatíveis
```

---

### 5.3 financialUtil — Cálculos Financeiros

**Ficheiro:** `backend/src/utils/financialUtil.js`

**Princípio:** A IA nunca faz aritmética financeira — os modelos LLM cometem erros com números. Todas as contas são feitas em JS puro com funções determinísticas.

#### Taxas IVA Portugal (restauração)

`backend/src/utils/financialUtil.js` — linhas 11–15
```js
export const TAX_RATES = {
  NORMAL:       0.23,  // bebidas alcoólicas
  INTERMEDIATE: 0.13,  // refeições no local ← default
  REDUCED:      0.06,  // bens essenciais embalados
};
```

#### Pipeline de cálculo

```
items = [{ price: 12.50, quantity: 2 }, { price: 3.00, quantity: 1 }]

calculateSubtotal(items)   → 12.50×2 + 3.00×1 = 28.00
applyDiscount(28.00, 0.10) → 28.00 × 0.10 = 2.80  (10% desconto)
taxableAmount              → 28.00 - 2.80 = 25.20
applyTax(25.20, 0.13)      → 25.20 × 0.13 = 3.28  (IVA 13%)
total                      → 25.20 + 3.28 = 28.48
```

`backend/src/utils/financialUtil.js` — linhas 72–92
```js
export function calculateInvoiceTotals({ items, taxRate = 0.13, discount = 0, discountType = 'percent' }) {
  const subtotal       = calculateSubtotal(items);
  const discountAmount = applyDiscount(subtotal, discount, discountType);
  const taxableAmount  = roundMoney(subtotal - discountAmount);
  const taxAmount      = applyTax(taxableAmount, taxRate);
  const total          = roundMoney(taxableAmount + taxAmount);
  return { subtotal, discountAmount, taxableAmount, taxAmount, total, taxRate };
}
```

`roundMoney` usa `Number.EPSILON` para evitar o clássico erro de vírgula flutuante (`0.1 + 0.2 = 0.30000000000000004` em JS).

---

### 5.4 classifyError — Erros Amigáveis

**Ficheiro:** `backend/src/utils/classifyError.js`

Transforma erros técnicos do Groq em mensagens compreensíveis em português:

| Tipo | HTTP | Mensagem ao utilizador |
|------|------|----------------------|
| `TIMEOUT` | — | "O assistente demorou demasiado a responder. Tenta novamente." |
| `RATE_LIMIT` | 429 | "Demasiados pedidos. Aguarda um momento." |
| `SERVICE_DOWN` | 503 | "O serviço de IA está temporariamente indisponível." |
| `AUTH_ERROR` | 502 | "Erro de autenticação com o serviço de IA." |
| `NETWORK_ERROR` | 502 | "Erro de rede ao contactar o serviço de IA." |
| `INVALID_REQUEST` | 400 | "Pedido inválido enviado ao modelo." |

---

### 5.5 Outros Utils

| Ficheiro | O que faz |
|----------|-----------|
| `chatBotUtil.js` | Constantes SSE (`ROLE_USER=2`, `ROLE_ASSISTANT=3`, `MAX_AGENTIC_STEPS=5`), helper `writeSseError` |
| `pipelineError.js` | Classe `PipelineError` — erro com `code`, `stage` e `details` para rastreabilidade |
| `fallbackMessages.js` | Mensagens PT geradas quando o LLM devolve apenas resultados de funções sem texto |

---

## 6. Fluxos Completos

### Fluxo A — Pedido via Chatbot (SSE + function calling)

```
[React] POST /chatbot/stream { message: "quero reservar mesa para 2 amanhã às 20h" }
    │
    ▼
[ChatbotController] abre SSE, persiste mensagem user na BD
    │
    ▼
[SmartBistroChatProcessor] loop agêntico (max 5 iterações):
    │
    ├── Iteração 1: LLM chama get_tables()
    │       → BD: SELECT mesas disponíveis
    │       → resultado devolvido ao LLM
    │
    ├── Iteração 2: LLM chama create_reservation({ table_id:3, date:"2026-06-05T20:00", guests:2 })
    │       → BD: INSERT reservations
    │       → resultado devolvido ao LLM
    │
    └── Iteração 3: LLM formula resposta final
            → streaming SSE: "A sua reserva foi criada para..."
            → event: done enviado ao cliente
    │
    ▼
[ChatbotController] persiste resposta do assistente na BD
[React] recebe texto em tempo real via EventSource
```

### Fluxo B — Pedido via Pipeline (linguagem natural → BD)

```
[React] POST /orders/pipeline { customer_name:"João", message:"2 hambúrgueres e uma água" }
    │
    ▼
[OrderPipelineController] valida campos obrigatórios
    │
    ▼
[runOrderPipeline]
    ├── [BD] mesas Available + menu activo
    ├── [MaitreAgent] → { table_id:5, items:[{item_id:3, qty:2}, {item_id:12, qty:1}] }
    ├── enforceMenuPrices() → corrige preços pelo menu real
    ├── [ChefAgent] → { kitchen_sequence:[...], stock_status:"ok" }
    ├── calculateInvoiceTotals() → { subtotal:25.50, taxAmount:3.32, total:28.82 }
    └── [ManagerAgent] → { success:true }
    │
    ▼
[OrderPipelineController]
    ├── findOrCreateCustomer("João")
    ├── createOrder(...)
    ├── createOrderItem(×3 em paralelo)
    ├── createInvoice({ total: 28.82 })
    ├── createPayment({ status:"Pending" })
    └── updateTableStatus(5, "Occupied")
    │
    ▼
[React] recebe { success:true, order_id, invoice, payment, financials }
```

### Fluxo D — Pedido via Carrinho Digital (cliente autenticado)

```
[Cliente] adiciona itens ao carrinho na MainPage
    │
    ▼
[Frontend] POST /orders { service_type:"Takeaway", order_status:"In Preparation", kitchen_sequence_json }
[Frontend] POST /order-items/bulk { order_id, items:[{item_id, quantity}] }
    │
    ▼
[KDS] auto-avança com timer → "Ready"
    │
    ▼
[orderController.updateStatus] detecta "Ready"
    ├── invoiceExistsForOrder() → falso
    ├── calculateInvoiceTotals({ items }) → { subtotal, taxAmount, total }
    ├── createInvoice({ order_id, total_amount, tax_amount, ... })
    └── createNotification({ customer_id, title: "Pedido pronto — pagamento pendente", message: "...X€" })
    │
    ▼
[Cliente] bell com badge → clica → vê notificação → clica "Pagar" → /perfil
    │
    ▼
[ProfilePage] banner "X faturas pendentes" → PaymentModal
[Frontend] POST /payments (por cada fatura) + PATCH /orders/:id/status → "Delivered"
    │
    ▼
[KDS] pedido move para coluna "Entregue"
```

**Nota:** Takeaway orders **não** auto-avançam de "Ready" → "Delivered" no KDS — ficam em espera até o pagamento ser confirmado.

### Fluxo C — KDS (staff da cozinha inicia pedido)

```
[Staff] POST /orders/42/chef-start
    │
    ▼
[KDSController]
    ├── getOrderById(42) → verifica status="Pending"
    ├── getItemsByOrderId(42) + getActiveItems() (em paralelo)
    ├── [ChefAgent] buildChefMessage(items, menu) → sequência + tempo
    └── updateOrder(42, { status:"In Preparation", kitchen_sequence_json })
    │
    ▼
[Staff] recebe { kitchen_sequence, estimated_seconds:45, stock_status:"ok" }
```

---

> **Resumo para a defesa:**
> O backend do SmartBistro combina uma API REST tradicional com uma camada de IA baseada em LLMs (Groq). Os agentes AI interpretam linguagem natural mas **nunca tomam decisões financeiras** — essas ficam sempre em código JS determinístico. O sistema é resiliente por design: fallback de modelos, loop de correcção de stock, classificação de erros e streaming SSE garantem que o utilizador tem sempre uma resposta útil, mesmo em condições adversas.

---

## 7. Tratamento de Erros do Bot (Chatbot)

O chatbot tem uma arquitectura de erros em **4 camadas** — cada camada apanha o que a anterior não consegue tratar, e o utilizador recebe sempre uma mensagem em português, nunca um crash silencioso.

---

### 7.1 Visão geral das 4 camadas

```
ERRO ACONTECE (timeout / 429 / rede / função inválida / BD)
        │
        ▼
┌─────────────────────────────────────────────────────────────┐
│  CAMADA 1 — Origem do erro                                  │
│  makeTimeout (45s) | _streamRound (fallback de modelos)     │
│  executeFunction (função não registada)                     │
└──────────────────────────┬──────────────────────────────────┘
                           │ erro bruto (SDK Groq / Error nativo)
                           ▼
┌─────────────────────────────────────────────────────────────┐
│  CAMADA 2 — classifyGroqError()                             │
│  Transforma erro técnico → { type, userMessage } em PT      │
│  Ficheiro: utils/classifyError.js                           │
└──────────────────────────┬──────────────────────────────────┘
                           │ { type: "RATE_LIMIT", userMessage: "..." }
                           ▼
┌─────────────────────────────────────────────────────────────┐
│  CAMADA 3 — PipelineError                                   │
│  Encapsula com code, stage, groqType, cause                 │
│  Ficheiro: utils/pipelineError.js                           │
└──────────────────────────┬──────────────────────────────────┘
                           │ PipelineError { groqType, message PT }
                           ▼
┌─────────────────────────────────────────────────────────────┐
│  CAMADA 4 — writeSseError()                                 │
│  Serializa para SSE e envia ao React                        │
│  Ficheiro: utils/chatBotUtil.js                             │
└──────────────────────────┬──────────────────────────────────┘
                           │ SSE event: "rate_limit"
                           ▼
                      [React / EventSource]
                   mostra mensagem ao utilizador
```

---

### 7.2 Camada 1 — Onde o erro nasce

Existem três pontos de origem possíveis:

#### A) Timeout de 45 segundos — `_streamRound` em BaseChatProcessor.js

O streaming usa `Promise.race` — se o Groq não responder em 45s, cria um erro já marcado com `groqType`:

`backend/src/genai/models/BaseChatProcessor.js` — linhas 136–170
```js
// BaseChatProcessor.js — _streamRound()
const streamTask = async () => {
  for await (const chunk of stream) {
    // processa cada fragmento de texto
    if (delta.content) thinkFilter.feed(delta.content);
    if (delta.tool_calls) { /* acumula function calls */ }
  }
};

const makeTimeout = () =>
  new Promise((_, reject) =>
    setTimeout(
      () => reject(Object.assign(
        new Error('O assistente demorou demasiado tempo a responder. Tente novamente. ⏱️'),
        { groqType: 'TIMEOUT' },  // ← marca o tipo directamente no erro
      )),
      45000,
    ),
  );

// Se timeout ganhar a corrida → lança o erro com groqType: 'TIMEOUT'
await Promise.race([streamTask(), makeTimeout()]);
```

#### B) Modelo Groq retorna 4xx/5xx — fallback em `_streamRound`

Antes de desistir, tenta todos os modelos da fila. Só falha quando todos falharem:

`backend/src/genai/models/BaseChatProcessor.js` — linhas 98–130
```js
// BaseChatProcessor.js — _streamRound()
for (let i = 0; i < GROQ_MODEL_QUEUE.length; i++) {
  const model = GROQ_MODEL_QUEUE[i];
  try {
    stream = await groq.chat.completions.create({ model, ...streamOpts });
    break; // sucesso → sai do loop
  } catch (err) {
    if (isRetryableGroqError(err) && i < GROQ_MODEL_QUEUE.length - 1) {
      console.warn(`[ChatProcessor] ${model} indisponível. A tentar próximo...`);
      continue; // 429/502/503 → tenta modelo seguinte
    }
    // Erro não recuperável OU todos os modelos falharam → classifica e lança
    const classified = classifyGroqError(err);
    const pe = new PipelineError(classified.userMessage, {
      code:    `GROQ_${classified.type}`,
      stage:   'provider',
      details: { message: err?.message },
      cause:   err,
    });
    pe.groqType = classified.type;
    throw pe;
  }
}
```

`isRetryableGroqError` aceita como recuperável (`backend/src/utils/groqUtil.js` — linhas 4–22):
```js
// groqUtil.js
status === 429 || status === 502 || status === 503 ||
msg.includes("timeout") || msg.includes("rate limit") || msg.includes("overloaded")
```

#### C) Função não registada — `executeFunction` em BaseChatProcessor.js

Se o LLM alucinasse um nome de função que não existe no `FUNCTION_HANDLERS`:

`backend/src/genai/models/BaseChatProcessor.js` — linhas 40–55
```js
// BaseChatProcessor.js — executeFunction()
async executeFunction(functionCall) {
  const { name } = functionCall;
  const handler  = this.functionHandlers[name];

  if (!handler)
    throw new PipelineError(`Função "${name}" não está registada.`, {
      code:    'FUNCTION_NOT_REGISTERED',
      stage:   'function_execution',
      details: { functionName: name },
    });

  const result = await handler(args);
  return { name, args, result, functionCall };
}
```

---

### 7.3 Camada 2 — classifyGroqError transforma o erro

**Ficheiro:** `backend/src/utils/classifyError.js`

Qualquer erro que chegue aqui — seja do timeout, do SDK Groq, ou de rede — é transformado num tipo estruturado com mensagem em português:

`backend/src/utils/classifyError.js` — linhas 4–72
```js
export function classifyGroqError(error) {
  // Erros já marcados com groqType (ex: TIMEOUT do makeTimeout)
  // → usa o mapeamento directo, não precisa de analisar a mensagem
  if (error?.groqType) {
    const map = {
      TIMEOUT:         { type: "TIMEOUT",         userMessage: "O assistente demorou demasiado tempo a responder. Tente novamente. ⏱️" },
      RATE_LIMIT:      { type: "RATE_LIMIT",      userMessage: "Limite de pedidos atingido. Aguarde alguns segundos e tente novamente. ⏳" },
      SERVICE_DOWN:    { type: "SERVICE_DOWN",    userMessage: "O serviço de IA está temporariamente indisponível. Tente novamente em alguns instantes. 🔧" },
      AUTH_ERROR:      { type: "AUTH_ERROR",      userMessage: "Erro de autenticação com o serviço de IA. Contacte o administrador. 🔑" },
      NETWORK_ERROR:   { type: "NETWORK_ERROR",   userMessage: "Não foi possível ligar ao serviço de IA. Verifique a sua ligação à internet. 🌐" },
      INVALID_REQUEST: { type: "INVALID_REQUEST", userMessage: "O pedido não pôde ser processado. Tente reformular a mensagem. ✏️" },
    };
    return map[error.groqType] ?? { type: error.groqType, userMessage: error.message };
  }

  // Erros brutos do SDK Groq → analisa status HTTP e keywords da mensagem
  const msg    = (error?.message || "").toLowerCase();
  const status = error?.status || error?.httpStatus || error?.code || 0;

  if (status === 503 || msg.includes("overloaded") || msg.includes("service unavailable"))
    return { type: "SERVICE_DOWN",    userMessage: "O serviço de IA está temporariamente indisponível... 🔧" };

  if (status === 429 || msg.includes("rate limit") || msg.includes("quota") || msg.includes("too many requests"))
    return { type: "RATE_LIMIT",      userMessage: "Limite de pedidos atingido... ⏳" };

  if (status === 401 || status === 403 || msg.includes("api key") || msg.includes("unauthenticated"))
    return { type: "AUTH_ERROR",      userMessage: "Erro de autenticação com o serviço de IA... 🔑" };

  if (msg.includes("timeout") || msg.includes("econnrefused") || msg.includes("fetch failed") || msg.includes("socket hang up"))
    return { type: "NETWORK_ERROR",   userMessage: "Não foi possível ligar ao serviço de IA... 🌐" };

  if (status === 400 || msg.includes("bad request") || msg.includes("invalid argument"))
    return { type: "INVALID_REQUEST", userMessage: "O pedido não pôde ser processado... ✏️" };

  return { type: "UNKNOWN", userMessage: "O assistente de IA não está disponível de momento. Tente novamente. 🤖" };
}
```

---

### 7.4 Camada 3 — PipelineError encapsula com contexto

**Ficheiro:** `backend/src/utils/pipelineError.js`

O erro classificado é embrulhado num `PipelineError` com código, stage e causa original:

`backend/src/utils/pipelineError.js` — linhas 1–13
```js
// pipelineError.js
export class PipelineError extends Error {
  constructor(message, { code, stage, details, cause } = {}) {
    super(message);
    this.code    = code;    // ex: "GROQ_RATE_LIMIT"
    this.stage   = stage;   // ex: "provider"
    this.details = details; // ex: { message: "429 Too Many Requests" }
    this.cause   = cause;   // erro original preservado
  }
}
```

Este encapsulamento acontece em dois pontos:

**Em `_streamRound` (quando falha ao criar o stream):**

`backend/src/genai/models/BaseChatProcessor.js` — linhas 121–130
```js
const classified = classifyGroqError(err);
const pe = new PipelineError(classified.userMessage, {
  code:    `GROQ_${classified.type}`,
  stage:   'provider',
  details: { message: err?.message },
  cause:   err,
});
pe.groqType = classified.type; // "RATE_LIMIT", "TIMEOUT", etc.
throw pe;
```

**Em `processChatStream` (catch do loop agêntico completo):**

`backend/src/genai/orchestrations/chatBotProcessor.js` — linhas 282–294
```js
// chatBotProcessor.js — processChatStream()
} catch (err) {
  const classified = classifyGroqError(err);
  const pe = new PipelineError(classified.userMessage, {
    code:    `GROQ_${classified.type}`,
    stage:   'provider',
    details: { message: err?.message },
    cause:   err,
  });
  pe.groqType      = classified.type;
  pe.originalError = err;

  if (onError) onError(pe); // ← passa para o controller via callback
  else throw pe;
}
```

---

### 7.5 Camada 4 — writeSseError envia ao React

**Ficheiro:** `backend/src/utils/chatBotUtil.js`

O `onError` callback definido no controller recebe o `PipelineError` e chama `writeSseError`:

`backend/src/controllers/chatBotController.js` — linhas 32–59
```js
// chatBotController.js — sendMessageToBotStream()
await processChatStream(message, String(convId), {
  onChunk: (text) => {
    fullText += text;
    res.write(`event: message\ndata: ${JSON.stringify({ text })}\n\n`);
  },
  onDone: async (_, functionResults = []) => {
    clearInterval(ping);
    // ... persiste resposta e envia event: done
  },
  onError: (err) => {          // ← recebe o PipelineError da camada 3
    clearInterval(ping);       // para o keep-alive de 20s
    writeSseError(res, err);   // serializa e envia via SSE
  },
});
```

`backend/src/utils/chatBotUtil.js` — linhas 25–39
```js
// chatBotUtil.js — writeSseError()
export function writeSseError(res, err) {
  res.write(
    `event: ${sseErrorEvent(err)}\ndata: ${JSON.stringify({
      success:   false,
      errorType: err?.groqType ?? 'UNKNOWN',
      message:   err.message,  // mensagem em PT do classifyGroqError
    })}\n\n`,
  );
  res.end(); // fecha a ligação SSE
}

// Converte groqType → nome do evento SSE
function sseErrorEvent(err) {
  const map = {
    RATE_LIMIT:      'rate_limit',
    SERVICE_DOWN:    'service_unavailable',
    AUTH_ERROR:      'auth_error',
    NETWORK_ERROR:   'network_error',
    INVALID_REQUEST: 'invalid_request',
  };
  return map[err?.groqType] ?? 'provider_error';
}
```

O que chega ao React via `EventSource`:
```
event: rate_limit
data: {"success":false,"errorType":"RATE_LIMIT","message":"Limite de pedidos atingido. Aguarde alguns segundos e tente novamente. ⏳"}

```

---

### 7.6 Fluxo real de um erro — exemplo com 429

Cenário: utilizador envia mensagem, Groq retorna 429 em todos os modelos.

```
[React] EventSource POST /chatbot/stream { message: "quero fazer um pedido" }
    │
    ▼
[chatBotController] abre SSE, inicia ping a cada 20s
    │
    ▼
[processChatStream] cria/recupera sessão → chama processor.chat()
    │
    ▼
[BaseChatProcessor._streamRound] tenta criar stream com modelo 1
    │   groq.chat.completions.create({ model: "llama-3.3-70b-versatile", stream: true })
    │   ← HTTP 429 Too Many Requests
    │
    ├── isRetryableGroqError(err) → true (status 429)
    │   tenta modelo 2: "openai/gpt-oss-120b" → 429
    │   tenta modelo 3: "openai/gpt-oss-20b"  → 429
    │   ... (todos os 8 modelos falharam)
    │
    ├── idx >= queue.length → não há mais modelos
    │
    ▼
[classifyGroqError] status===429
    │   → { type: "RATE_LIMIT", userMessage: "Limite de pedidos atingido... ⏳" }
    │
    ▼
[new PipelineError("Limite de pedidos...", { code:"GROQ_RATE_LIMIT", stage:"provider" })]
    │   pe.groqType = "RATE_LIMIT"
    │   throw pe
    │
    ▼
[processChatStream catch] recebe PipelineError
    │   classifyGroqError(pe) → reutiliza pe.groqType → "RATE_LIMIT"
    │   new PipelineError (outer wrapper com causa original)
    │   onError(pe) ← chama callback do controller
    │
    ▼
[chatBotController onError(err)]
    │   clearInterval(ping)  ← para keep-alive
    │   writeSseError(res, err)
    │       sseErrorEvent(err) → "rate_limit"
    │       res.write("event: rate_limit\ndata: {...}\n\n")
    │       res.end()
    │
    ▼
[React EventSource]
    eventSource.addEventListener('rate_limit', (e) => {
      const { message } = JSON.parse(e.data);
      // → "Limite de pedidos atingido. Aguarde alguns segundos e tente novamente. ⏳"
      showErrorToast(message);
    });
```

---

### 7.7 Casos especiais de recuperação (não são erros)

#### Resposta vazia do LLM

Se o Groq devolver stream vazio (sem texto e sem function calls), o processador faz **uma segunda tentativa automática** com um hint, sem reportar erro ao utilizador:

`backend/src/genai/models/BaseChatProcessor.js` — linhas 262–278
```js
// BaseChatProcessor.js — processChatMessageStream()
let { functionCalls, assistantMsg } = await this._streamRound(messages, emit);

if (!functionCalls.length && !allChunks.length) {
  // Não adiciona o assistantMsg vazio — dois assistant consecutivos
  // sem user entre eles viola o formato OpenAI → causaria HTTP 400
  ({ functionCalls, assistantMsg } = await this._streamRound(
    [...messages, {
      role:    'user',
      content: `${userMessage}\n\n[Sistema: continua o fluxo — chama as ferramentas necessárias para avançar.]`,
    }],
    emit,
  ));
}
// Só adiciona o assistantMsg definitivo depois desta verificação
messages.push(assistantMsg);
```

#### Loop agêntico atingiu MAX_AGENTIC_STEPS = 5

O bot pode encadear até 5 chamadas de funções por mensagem. Se atingir o limite, **devolve a melhor resposta com o que tem** — nunca bloqueia:

`backend/src/utils/chatBotUtil.js` — linha 6
`backend/src/genai/models/BaseChatProcessor.js` — linhas 281–315
```js
// chatBotUtil.js
export const MAX_AGENTIC_STEPS = 5;

// BaseChatProcessor.js
let step = 0;
while (functionCalls.length && step < MAX_AGENTIC_STEPS) {
  step++;
  const execResults = await Promise.all(callsToExecute.map(fc => this.executeFunction(fc)));
  // ...envia resultados ao LLM e recebe próxima resposta
}
// Saiu do loop (limite ou sem mais function calls)
// → retorna a resposta parcial acumulada
return {
  success:         true,
  message:         synthesizeFallbackMessage(allChunks, allResults),
  functionResults: allResults,
};
```

#### LLM não gerou texto (só chamou funções)

`synthesizeFallbackMessage` gera uma resposta em PT a partir do resultado da última função, sem precisar de uma nova chamada ao LLM:

`backend/src/utils/fallbackMessages.js` — linhas 3–86
```js
// fallbackMessages.js
export function synthesizeFallbackMessage(allChunks, allResults) {
  const text = allChunks.join('');
  if (text.trim()) return text; // tem texto → usa-o

  // Sem texto → gera mensagem a partir da última função executada
  const last = allResults[allResults.length - 1];
  const { name, result: raw } = last;

  if (name === 'create_reservation' && raw?.id)
    return `Reserva criada com sucesso (ID ${raw.id}). Deseja receber confirmação por SMS?`;
  if (name === 'create_order' && raw?.id)
    return `Pedido criado com sucesso (ID ${raw.id}). Deseja acrescentar mais itens?`;
  if (name === 'calculate_invoice_totals' && raw?.total_amount != null)
    return `Total calculado: ${raw.total_amount}. Deseja que eu crie a fatura?`;
  // ... mais casos para cada função
  return 'Operação concluída. Em que mais posso ajudar?';
}
```

---

### 7.8 Tabela completa de todos os cenários

| O que acontece | Ficheiro de origem | groqType | SSE event | Mensagem ao utilizador |
|---|---|---|---|---|
| Groq demora >45s | `makeTimeout` | `TIMEOUT` | `provider_error` | "O assistente demorou demasiado..." ⏱️ |
| Groq 429 em todos os modelos | `_streamRound` | `RATE_LIMIT` | `rate_limit` | "Limite de pedidos atingido..." ⏳ |
| Groq 503 em todos os modelos | `_streamRound` | `SERVICE_DOWN` | `service_unavailable` | "Serviço de IA indisponível..." 🔧 |
| API key inválida (401/403) | `_streamRound` | `AUTH_ERROR` | `auth_error` | "Erro de autenticação..." 🔑 |
| Sem rede / ECONNREFUSED | `_streamRound` | `NETWORK_ERROR` | `network_error` | "Não foi possível ligar..." 🌐 |
| Pedido malformado (400) | `_streamRound` | `INVALID_REQUEST` | `invalid_request` | "Pedido não pôde ser processado..." ✏️ |
| Função alucinada pelo LLM | `executeFunction` | — | `provider_error` | PipelineError com FUNCTION_NOT_REGISTERED |
| Stream vazio (sem texto/fns) | `processChatMessageStream` | — | *(recupera)* | Segunda tentativa automática com hint |
| Loop agêntico >5 passos | `processChatMessageStream` | — | *(resposta parcial)* | `synthesizeFallbackMessage` em PT |
| LLM não gerou texto (só fns) | `synthesizeFallbackMessage` | — | *(mensagem gerada)* | Texto gerado a partir do resultado da função |

---

### 7.9 Diagrama final — do erro ao utilizador

```
ERRO NASCE
  (timeout / 429 / rede / função inválida)
        │
        ▼
classifyGroqError()                    ← utils/classifyError.js
  { type: "RATE_LIMIT",
    userMessage: "Limite de pedidos..." }
        │
        ▼
new PipelineError(userMessage, {       ← utils/pipelineError.js
  code: "GROQ_RATE_LIMIT",
  stage: "provider",
  groqType: "RATE_LIMIT"
})
        │
        ▼
onError(pe)  [callback do controller]  ← chatBotController.js
  clearInterval(ping)
  writeSseError(res, pe)               ← utils/chatBotUtil.js
        │
        ▼
SSE enviado ao cliente:
  event: rate_limit
  data: {
    "success": false,
    "errorType": "RATE_LIMIT",
    "message": "Limite de pedidos atingido. Aguarde alguns segundos e tente novamente. ⏳"
  }
        │
        ▼
[React EventSource]
  .addEventListener('rate_limit', handler)
  → mostra mensagem ao utilizador
```

**Para a defesa:** Cada erro tem um caminho determinístico do ponto de falha até ao utilizador. O sistema nunca deixa o utilizador bloqueado — há sempre uma mensagem clara em português, seja pelo fallback de modelos (tenta até 8), pelo timeout com aviso, ou pela resposta parcial quando o loop agêntico atinge o limite.

---

### 7.10 Os 4 Ficheiros de Erro — Explicação Detalhada

Os erros do chatbot passam sempre por estes 4 ficheiros, nesta ordem. Cada um tem uma responsabilidade única e bem definida.

---

#### Ficheiro 1 — `backend/src/utils/groqUtil.js` (função `isRetryableGroqError`)

**Papel:** Decide se um erro justifica tentar o próximo modelo ou se deve falhar imediatamente.

É chamado dentro do loop de fallback em `_streamRound`. Retorna `true` para erros temporários (sobrecarga, rate limit, gateway), `false` para erros permanentes (autenticação, pedido inválido).

`backend/src/utils/groqUtil.js` — linhas 4–22
```js
export function isRetryableGroqError(error) {
  const msg    = (error?.message ?? "").toLowerCase();
  const status = Number(error?.status ?? error?.code ?? 0);
  return (
    error?.groqType === 'TIMEOUT' ||
    status === 429 ||           // Rate Limit
    status === 502 ||           // Bad Gateway
    status === 503 ||           // Service Unavailable
    msg.includes("timeout")  ||
    msg.includes("quota")    ||
    msg.includes("rate limit")||
    msg.includes("overloaded")||
    msg.includes("unavailable")
  );
}
```

**Quando retorna `true`:** o sistema tenta o modelo seguinte na fila (`idx + 1`).
**Quando retorna `false`:** o erro é classificado e lançado imediatamente — não adianta tentar outro modelo.

---

#### Ficheiro 2 — `backend/src/utils/classifyError.js` (função `classifyGroqError`)

**Papel:** Transforma qualquer erro técnico num tipo estruturado com mensagem em português compreensível para o utilizador.

É chamado em dois momentos: dentro de `_streamRound` quando todos os modelos falharam, e no `catch` de `processChatStream` como último recurso.

`backend/src/utils/classifyError.js` — linhas 4–72
```js
export function classifyGroqError(error) {
  // Caminho rápido: erro já tem groqType marcado (ex: makeTimeout)
  if (error?.groqType) {
    const map = {
      TIMEOUT:         { type: "TIMEOUT",         userMessage: "O assistente demorou demasiado tempo a responder. Tente novamente. ⏱️" },
      RATE_LIMIT:      { type: "RATE_LIMIT",      userMessage: "Limite de pedidos atingido. Aguarde alguns segundos e tente novamente. ⏳" },
      SERVICE_DOWN:    { type: "SERVICE_DOWN",    userMessage: "O serviço de IA está temporariamente indisponível. Tente novamente em alguns instantes. 🔧" },
      AUTH_ERROR:      { type: "AUTH_ERROR",      userMessage: "Erro de autenticação com o serviço de IA. Contacte o administrador. 🔑" },
      NETWORK_ERROR:   { type: "NETWORK_ERROR",   userMessage: "Não foi possível ligar ao serviço de IA. Verifique a sua ligação à internet. 🌐" },
      INVALID_REQUEST: { type: "INVALID_REQUEST", userMessage: "O pedido não pôde ser processado. Tente reformular a mensagem. ✏️" },
    };
    return map[error.groqType] ?? { type: error.groqType, userMessage: error.message };
  }

  // Análise do erro bruto do SDK: status HTTP + keywords da mensagem
  const msg    = (error?.message || "").toLowerCase();
  const status = error?.status || 0;

  if (status === 503 || msg.includes("overloaded"))    return { type: "SERVICE_DOWN",    userMessage: "..." };
  if (status === 429 || msg.includes("rate limit"))    return { type: "RATE_LIMIT",      userMessage: "..." };
  if (status === 401 || msg.includes("api key"))       return { type: "AUTH_ERROR",      userMessage: "..." };
  if (msg.includes("timeout") || msg.includes("econnrefused")) return { type: "NETWORK_ERROR", userMessage: "..." };
  if (status === 400)                                  return { type: "INVALID_REQUEST", userMessage: "..." };

  return { type: "UNKNOWN", userMessage: "O assistente de IA não está disponível de momento. Tente novamente. 🤖" };
}
```

**O que devolve:** sempre um objecto `{ type: string, userMessage: string }` — nunca lança excepção.

---

#### Ficheiro 3 — `backend/src/utils/pipelineError.js` (classe `PipelineError`)

**Papel:** Encapsula o erro classificado com contexto de rastreabilidade — código, stage, causa original e `groqType`.

É o "envelope" que transporta o erro do ponto de origem até ao controller, preservando toda a informação útil para debug sem expor detalhes técnicos ao utilizador.

`backend/src/utils/pipelineError.js` — linhas 1–13
```js
export class PipelineError extends Error {
  constructor(message, { code, stage, details, cause } = {}) {
    super(message);          // message já está em português (vem do classifyGroqError)
    this.code    = code;     // ex: "GROQ_RATE_LIMIT", "FUNCTION_NOT_REGISTERED"
    this.stage   = stage;    // ex: "provider", "function_execution", "maitre_validation"
    this.details = details;  // objecto com contexto extra (ex: { message: err.message })
    this.cause   = cause;    // erro original SDK preservado para debug
  }
}
// Propriedades adicionadas dinamicamente após construção:
// pe.groqType      = "RATE_LIMIT"   ← tipo classificado
// pe.originalError = sdkError       ← erro bruto do Groq
```

**Como é criado:** após `classifyGroqError` devolver `{ type, userMessage }`, o código cria:
```js
const pe = new PipelineError(classified.userMessage, {
  code:    `GROQ_${classified.type}`,  // "GROQ_RATE_LIMIT"
  stage:   'provider',
  details: { message: err?.message },
  cause:   err,
});
pe.groqType = classified.type;         // facilita verificações downstream
```

**Onde é criado:** em `_streamRound` (linha 121) e em `processChatStream` (linha 282) — dois pontos de catch distintos para garantir que nenhum erro escapa sem ser encapsulado.

---

#### Ficheiro 4 — `backend/src/utils/chatBotUtil.js` (funções `writeSseError` e `sseErrorEvent`)

**Papel:** Serializa o `PipelineError` para o formato SSE e envia ao cliente React, fechando a ligação.

É o último passo — o ponto onde o erro sai do backend e chega ao browser.

`backend/src/utils/chatBotUtil.js` — linhas 25–39
```js
// Converte groqType → nome do evento SSE que o React vai escutar
export function sseErrorEvent(err) {
  const map = {
    RATE_LIMIT:      'rate_limit',          // React: addEventListener('rate_limit', ...)
    SERVICE_DOWN:    'service_unavailable',
    AUTH_ERROR:      'auth_error',
    NETWORK_ERROR:   'network_error',
    INVALID_REQUEST: 'invalid_request',
  };
  return map[err?.groqType] ?? 'provider_error'; // fallback se tipo desconhecido
}

// Escreve o evento SSE e fecha a ligação
export function writeSseError(res, err) {
  res.write(
    `event: ${sseErrorEvent(err)}\ndata: ${JSON.stringify({
      success:   false,
      errorType: err?.groqType ?? 'UNKNOWN',
      message:   err.message,   // ← mensagem em PT do classifyGroqError
    })}\n\n`,
  );
  res.end(); // fecha a ligação SSE — o cliente sabe que acabou
}
```

**O que chega ao browser (exemplo com rate limit):**
```
event: rate_limit
data: {"success":false,"errorType":"RATE_LIMIT","message":"Limite de pedidos atingido. Aguarde alguns segundos e tente novamente. ⏳"}

```

O React escuta com `eventSource.addEventListener('rate_limit', handler)` e mostra o `message` ao utilizador via `ProviderErrorCard`.

**Constantes extras neste ficheiro** (linhas 1–23):
```js
export const ROLE_USER      = 2;        // role_id do utilizador na tabela roles
export const ROLE_ASSISTANT = 3;        // role_id do assistente
export const MAX_AGENTIC_STEPS = 5;     // limite de function calls por mensagem

export const SSE_ERROR_EVENT = {
  RATE_LIMIT:      'rate_limit',
  SERVICE_DOWN:    'service_unavailable',
  AUTH_ERROR:      'auth_error',
  NETWORK_ERROR:   'network_error',
  INVALID_REQUEST: 'invalid_request',
};
```

---

#### Resumo dos 4 ficheiros

| Ficheiro | Função principal | Entrada | Saída |
|----------|-----------------|---------|-------|
| `groqUtil.js` | `isRetryableGroqError` | Erro SDK bruto | `true` / `false` (tenta próximo modelo?) |
| `classifyError.js` | `classifyGroqError` | Erro SDK bruto ou com `groqType` | `{ type, userMessage }` em PT |
| `pipelineError.js` | classe `PipelineError` | `userMessage` + metadados | Objecto erro estruturado com `groqType`, `code`, `stage` |
| `chatBotUtil.js` | `writeSseError` + `sseErrorEvent` | `PipelineError` + `res` | Evento SSE enviado ao React + ligação fechada |
