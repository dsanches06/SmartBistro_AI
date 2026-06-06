# SmartBistro AI — Documentação do Frontend

> Guia técnico para preparação da defesa de projecto.
> Stack: React 19 + Vite + Tailwind CSS 4 + Chart.js + SSE

---

## Índice

1. [Stack Tecnológico](#1-stack-tecnológico)
2. [Estrutura de Pastas](#2-estrutura-de-pastas)
3. [Routing e Protecção de Rotas](#3-routing-e-protecção-de-rotas)
4. [Autenticação — AuthContext](#4-autenticação--authcontext)
5. [Service Layer — Ligação ao Backend](#5-service-layer--ligação-ao-backend)
6. [Páginas Principais](#6-páginas-principais)
   - [ClientesPage](#61-clientespage)
   - [MenuPage](#62-menupage)
   - [OrdersPage](#63-orderspage)
   - [StockPage](#64-stockpage)
   - [MainPage — Cardápio Digital](#65-mainpage--cardápio-digital)
   - [ProfilePage — Perfil do Cliente](#66-profilepage--perfil-do-cliente)
7. [Chatbot — Integração SSE](#7-chatbot--integração-sse)
8. [UX/UI e Responsividade](#8-uxui-e-responsividade)
9. [Notificações — Bell no Header](#9-notificações--bell-no-header)
10. [Fluxo Completo Cliente](#10-fluxo-completo-cliente)

---

## 1. Stack Tecnológico

| Tecnologia | Versão | Para quê |
|------------|--------|----------|
| React | 19.2.7 | Framework UI — componentes e estado |
| Vite | 8.0.16 | Build tool + servidor de dev com proxy |
| Tailwind CSS | 4.3.0 | Estilos utilitários, responsividade |
| React Router | 7.16.0 | SPA routing com rotas protegidas |
| Chart.js + react-chartjs-2 | 4.5.1 | Gráficos (doughnut, line) no perfil |
| Framer Motion | 12.40.0 | Animações de entrada/saída |
| ESLint | — | Qualidade de código |

**Sem bibliotecas de estado externas** (Redux, Zustand) — usa Context API nativo do React para auth e tema.

**Sem Axios** — usa `fetch` nativo + SSE nativo (`EventSource`).

---

## 2. Estrutura de Pastas

```
frontend/src/
├── components/
│   ├── chat/          ← Chatbot (ChatUI, ChatBubble, ChatInput, ChatHistory...)
│   ├── layout/        ← Header, BottomNav, MainLayout, PageLoader
│   └── ui/            ← Componentes reutilizáveis (modais, badges, botões)
├── context/
│   ├── AuthContext.jsx ← Estado global de autenticação (user, token, login, logout)
│   └── ThemeContext.jsx ← Dark/Light mode
├── pages/
│   ├── MainPage.jsx    ← Landing page pública (cardápio + modais login/registo)
│   ├── ClientesPage.jsx
│   ├── MenuPage.jsx
│   ├── OrdersPage.jsx
│   ├── StockPage.jsx
│   ├── DashboardPage.jsx
│   ├── KdsPage.jsx
│   ├── ProfilePage.jsx
│   └── ...
├── services/
│   ├── BaseService.js  ← Classe base com fetch, POST, SSE
│   ├── api.js          ← URL base (dev vs prod)
│   ├── authService.js
│   ├── orderService.js
│   ├── chatService.js
│   └── ... (16 services)
├── utils/             ← Funções auxiliares partilhadas
└── App.jsx            ← Router principal com lazy loading
```

---

## 3. Routing e Protecção de Rotas

**Ficheiro:** `frontend/src/App.jsx`

O React Router está organizado em 3 níveis de acesso:

```
/ (público)
├── /                    ← MainPage — landing + modais login/registo
└── /login               ← LoginPage dedicada

ProtectedRoute (requer token JWT válido)
└── /perfil              ← ProfilePage — qualquer utilizador autenticado

AdminRoute (requer role_id === 1)
├── /dashboard           ← KPIs e analytics
├── /orders              ← Gestão de pedidos
├── /kds                 ← Kitchen Display System
├── /stock               ← Inventário
├── /clientes            ← Gestão de clientes
├── /menu                ← Gestão do menu
├── /table               ← Gestão de mesas
├── /faturacao           ← Faturação
└── /relatorios          ← Relatórios
```

### ProtectedRoute

`frontend/src/components/auth/ProtectedRoute.jsx` — linhas 5–19
```jsx
export default function ProtectedRoute() {
  const { user, loading } = useAuth();

  if (loading) {
    return <TrophySpin message="A verificar sessão..." />;
  }

  if (!user) return <Navigate to="/" replace />;
  return <Outlet />;
}
```

### AdminRoute

`frontend/src/components/auth/AdminRoute.jsx` — linhas 5–20
```jsx
export default function AdminRoute() {
  const { user, loading } = useAuth();

  if (loading) {
    return <TrophySpin message="A verificar sessão..." />;
  }

  // Utilizadores normais (role_id=2) só acedem ao seu perfil
  if (!user || user.role_id !== 1) return <Navigate to="/perfil" replace />;
  return <Outlet />;
}
```

### Code Splitting (lazy loading)

`frontend/src/App.jsx` — linhas 12–23 (imports) e linha 52 (Suspense)
```jsx
// todas as páginas carregadas de forma lazy
const ClientesPage  = lazy(() => import("@/pages/ClientesPage"));
const MenuPage      = lazy(() => import("@/pages/MenuPage"));
const OrdersPage    = lazy(() => import("@/pages/OrdersPage"));
// ...

// Envolvidas em Suspense com PageLoader
<Suspense fallback={<PageLoader />}>
  <Routes>
    <Route path="/" element={<MainPage />} />
    <Route element={<ProtectedRoute />}>
      <Route element={<AdminRoute />}>
        <Route path="/clientes" element={<ClientesPage />} />
      </Route>
    </Route>
  </Routes>
</Suspense>
```

Isto reduz o bundle inicial — cada página só é carregada quando o utilizador navega para lá.

---

## 4. Autenticação — AuthContext

**Ficheiro:** `frontend/src/context/AuthContext.jsx`

Estado global de autenticação partilhado por toda a aplicação via Context API:

```jsx
// O que o AuthContext fornece a todos os componentes:
const { user, token, loading, login, register, logout, updateUser } = useAuth();
```

`updateUser(data)` — merge parcial do objecto `user` em memória sem invalidar sessão. Usado pelo `EditProfileModal` após guardar alterações de nome/email/telefone via `customerService.update()`.

### Fluxo de autenticação

```
App arranca
    │
    ▼
AuthContext lê localStorage ("sb_token")       ← AuthContext.jsx:10
    │
    ├── token existe → authService.me(token) → valida no backend
    │       ├── válido → user definido, app carrega normalmente
    │       └── inválido/expirado → limpa localStorage, user=null
    │
    └── sem token → user=null, mostra landing page

Utilizador faz login
    │
    ▼
authService.login(identifier, password)        ← AuthContext.jsx:32-36
    → POST /auth/login
    → backend devolve { token, user }
    │
    ▼
token guardado em localStorage("sb_token")     ← AuthContext.jsx:26-30
user guardado em AuthContext
    → React Router redireciona para /dashboard (admin) ou /perfil (cliente)
```

`frontend/src/context/AuthContext.jsx` — linhas 14–24 (validação no arranque)
```jsx
useEffect(() => {
  if (!token) { setLoading(false); return; }

  authService.me(token)
    .then(setUser)
    .catch(() => {
      localStorage.removeItem(TOKEN_KEY); // token inválido → limpa
      setToken(null);
    })
    .finally(() => setLoading(false));
}, []);
```

`frontend/src/context/AuthContext.jsx` — linhas 32–50 (login / logout)
```jsx
async function login(identifier, password) {
  const data = await authService.login(identifier, password);
  localStorage.setItem(TOKEN_KEY, data.token);
  setToken(data.token);
  setUser(data.user);
  return data.user;
}

function logout() {
  localStorage.removeItem(TOKEN_KEY);
  setToken(null);
  setUser(null);
  if (t) authService.logout(t).catch(() => {});
}
```

### Objecto user

```js
{
  id:         number,
  name:       string,
  username:   string,
  email:      string,
  phone:      string,
  role_id:    1,        // 1=admin, 2=cliente
  active:     boolean,
  created_at: "ISO 8601"
}
```

---

## 5. Service Layer — Ligação ao Backend

**Ficheiro:** `frontend/src/services/BaseService.js`

Todos os 16 services extendem `BaseService`, que abstrai os detalhes do `fetch`:

`frontend/src/services/BaseService.js` — linhas 22–138
```js
class BaseService {
  constructor(baseEndpoint) {
    this.BACKEND_URL  = BACKEND_URL;   // calculado uma vez no arranque
    this.baseEndpoint = baseEndpoint;
  }

  // GET — linha 114
  async fetchData(endpoint) {
    const res = await fetch(`${this.BACKEND_URL}${endpoint}`);
    if (!res.ok) throw new Error(`Erro ao buscar dados: ${res.status}`);
    return res.json();
  }

  // POST — linha 103
  async sendMessage(endpoint, payload) {
    const res = await fetch(`${this.BACKEND_URL}${endpoint}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error(`API error: ${res.status}`);
    return res.json();
  }

  // SSE streaming — linha 29
  async sendStreamMessage(endpoint, payload, onChunk, onDone) {
    const response = await fetch(`${this.BACKEND_URL}${endpoint}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const reader  = response.body.getReader();
    const decoder = new TextDecoder();
    // processa cada linha SSE: "event: message\ndata: {...}\n\n"
    // → chama onChunk(text) por fragmento
    // → chama onDone(payload) no event: done
  }
}
```

### Resolução do URL base

`frontend/src/services/BaseService.js` — linhas 2–19
```js
export function getBackendUrl() {
  if (import.meta.env.PROD) return "/api";       // produção → path relativo

  const raw = import.meta.env.VITE_BACKEND_URL;
  if (raw) return raw.endsWith("/api") ? raw : raw.replace(/\/?$/, "/api");

  return "/api";                                 // fallback
}

export const BACKEND_URL = getBackendUrl();      // calculado uma vez no arranque
```

### Os 16 services disponíveis

| Service | Endpoints principais |
|---------|---------------------|
| `authService` | `/auth/login`, `/auth/register`, `/auth/me`, `/auth/logout` |
| `customerService` | `/customers`, `/customers/:id` |
| `orderService` | `/orders`, `/orders/:id`, `/orders/:id/status` |
| `orderItemService` | `/order-items` (bulk create) |
| `itemService` | `/items`, `/items/:id` |
| `stockService` | `/stock`, `/stock/:id` |
| `invoiceService` | `/invoices`, `/invoices/:id` |
| `paymentService` | `/payments`, `/payments/:id` |
| `tableService` | `/tables`, `/tables/:id` |
| `reservationService` | `/reservations` |
| `notificationService` | `/notifications` |
| `chatService` | `/chat/message/stream` (SSE) |
| + 4 mais | ingredientService, reportService... |

---

## 6. Páginas Principais

### 6.1 ClientesPage

**Ficheiro:** `frontend/src/pages/ClientesPage.jsx`

Gestão completa de clientes com painel de detalhe lateral.

**Funcionalidades:**
- Grid de cards com avatar, nome e telefone
- Filtros por estado (Todos / Activos / Inactivos)
- Pesquisa por nome e ordenação A-Z / Z-A
- Modal de criação de cliente (nome + telefone)
- Diálogo de confirmação de eliminação

**Painel de detalhe (admin vs cliente):**

| Vista admin | Vista cliente |
|-------------|---------------|
| Lista de notificações (lidas/não lidas) | Histórico de pedidos com paginação |
| Badges de contagem | Gráfico Doughnut (gasto por categoria) |
| — | Gráfico Line (valor por categoria ao longo do tempo) |

`frontend/src/pages/ClientesPage.jsx` — linhas 497–532
```jsx
// suporte a query param para abrir detalhe directamente
// URL: /clientes?open=42 → abre painel do cliente ID 42
const [searchParams] = useSearchParams();

useEffect(() => {
  const openId = Number(searchParams.get("open"));
  if (openId && customers.length) {
    const found = customers.find(c => c.id === openId);
    if (found) setSelectedCustomer(found);
  }
}, [searchParams, customers]);
```

**Services usados:** `customerService`, `orderService`, `invoiceService`, `orderItemService`

---

### 6.2 MenuPage

**Ficheiro:** `frontend/src/pages/MenuPage.jsx`

Gestão do menu activo do restaurante.

**Funcionalidades:**
- Lista de itens com filtros por categoria (Prato Principal, Sobremesa, Bebida...)
- Barra de pesquisa
- Vista tabela (desktop) + vista cards (mobile)
- **Edição inline de preço** — clica no preço, edita, Enter para guardar, Escape para cancelar
- Toggle activo/inactivo por item
- Modal de criação de item (nome + categoria + preço)
- Auto-refresh a cada 30 segundos
- Paginação configurável

`frontend/src/pages/MenuPage.jsx` — linhas 6–37 (componente `PriceEditor`) e linha 254 (`editingId`)
```jsx
// Componente PriceEditor — edição inline de preço (linhas 6–37)
function PriceEditor({ item, onSave, onCancel, saving }) {
  const [val, setVal] = useState(String(item.price));
  const confirm = () => {
    const n = parseFloat(val.replace(",", "."));
    if (!isNaN(n) && n > 0) onSave(n);
  };
  return (
    <input
      type="number"
      value={val}
      onChange={e => setVal(e.target.value)}
      onKeyDown={e => { if (e.key === "Enter") confirm(); if (e.key === "Escape") onCancel(); }}
    />
  );
}

// Estado de controlo — linha 254
const [editingId, setEditingId] = useState(null);

// handleSavePrice — linhas 293–299
const handleSavePrice = async (newPrice) => {
  const item = items.find(i => i.id === editingId);
  await itemService.update(item.id, { name: item.name, category: item.category, price: newPrice });
  setItems(prev => prev.map(i => i.id === item.id ? { ...i, price: newPrice } : i));
};
```

---

### 6.3 OrdersPage

**Ficheiro:** `frontend/src/pages/OrdersPage.jsx`

Monitorização e gestão de todos os pedidos em tempo real.

**Funcionalidades:**
- Tabs de filtro: Todos / Pending / In Preparation / Ready / Completed / Cancelled
- Pesquisa por ID ou nome do cliente
- Modal de criação de pedido:
  - Tipo de serviço (Mesa ou Takeaway)
  - Selecção de mesa (se Mesa)
  - Cliente opcional
  - Selecção de itens com ajuste de quantidade
  - Total calculado automaticamente
- Badges de estado com código de cor:

| Estado | Cor |
|--------|-----|
| Pending | Amarelo |
| In Preparation | Azul |
| Ready | Verde |
| Completed | Cinzento |
| Cancelled | Vermelho |

- Vista tabela (desktop): ID, Mesa/Takeaway, Cliente, Estado, Itens, Total, Hora
- Vista cards (mobile): resumo compacto
- Auto-refresh 30 segundos

---

### 6.4 StockPage

**Ficheiro:** `frontend/src/pages/StockPage.jsx`

Gestão do inventário de ingredientes.

**Funcionalidades:**
- Vista combinada stock + metadata do ingrediente
- Ícones de produto com emoji e cor de fundo
- Badges de estado:

| Estado | Condição |
|--------|----------|
| In Stock | quantidade > mínimo |
| Low Stock | quantidade ≤ mínimo |
| Out of Stock | quantidade = 0 |

- **Edição inline de quantidade** — clica na quantidade, edita, confirma
- Pesquisa e filtro por nome
- Vista tabela (desktop) + cards (mobile)
- Auto-refresh 30 segundos
- Paginação

---

## 7. Chatbot — Integração SSE

**Pasta:** `frontend/src/components/chat/`

O chatbot é um **modal flutuante acessível em todas as páginas** da aplicação.

### Componentes

| Componente | Responsabilidade |
|------------|-----------------|
| `ChatUI.jsx` | Orquestrador principal — estado, SSE, histórico |
| `ChatBubbleUI.jsx` | Renderização de mensagens user/bot |
| `ChatInputUI.jsx` | Input de texto + submissão |
| `ChatHeaderUI.jsx` | Cabeçalho com botão de histórico e fechar |
| `ChatHistory.jsx` | Histórico agrupado por data |
| `ChatLoadingUI.jsx` | Spinner de carregamento |
| `ProviderErrorCard.jsx` | Card de erro com botão de retry |

### Fluxo SSE no frontend

```
Utilizador escreve mensagem → Submit
        │
        ▼
chatService.sendMessageToBotStream(message, conversationId)
        │   POST /chat/message/stream
        │   Content-Type: text/event-stream
        │
        ▼
EventSource recebe eventos:

event: message          → onChunk(text) → acrescenta ao texto do bot
data: {"text": "Olá!"}

event: done             → onDone(data) → finaliza mensagem
data: {"success": true, "functionResults": [...]}

event: rate_limit       → onError → ProviderErrorCard com retry
data: {"message": "Limite atingido..."}
```

`frontend/src/components/chat/ChatUI.jsx` — linha 186 (chamada ao service)
`frontend/src/services/BaseService.js` — linhas 29–100 (processamento SSE)
```jsx
// ChatUI.jsx:186 — chamada ao chatService com callbacks
await chatService.sendMessageToBotStream(
  userMessage,
  updatedHistory,
  makeOnChunk(botMsgId),   // onChunk → acrescenta fragmento ao texto do bot
  makeOnDone(botMsgId),    // onDone → finaliza, guarda no histórico
  conversationId,
);

// BaseService.js:47-58 — dentro do sendStreamMessage, processa eventos SSE
if (event === "message") {
  const p = JSON.parse(data);
  if (p?.text) onChunk(p.text);       // ← chama o makeOnChunk do ChatUI
}
if (event === "done") {
  const p = JSON.parse(data);
  if (onDone) onDone(p);              // ← chama o makeOnDone do ChatUI
}
```

### Tratamento de erros no frontend

| Evento SSE | Componente | O que mostra |
|------------|-----------|-------------|
| `rate_limit` | `ProviderErrorCard` | "Limite de pedidos — tenta mais tarde" + retry |
| `service_unavailable` | `ProviderErrorCard` | "Serviço indisponível" + retry |
| `auth_error` | `ProviderErrorCard` | "Erro de autenticação" |
| `network_error` | `ProviderErrorCard` | "Sem ligação" + retry |
| `timeout` / `provider_error` | `ProviderErrorCard` | Mensagem genérica + retry |

### Funcionalidades extra do chatbot

- **Conversas persistentes**: guarda `conversationId` entre sessões
- **Cards de menu**: o bot pode sugerir itens do menu como cards clicáveis
- **Resultados de funções**: mostra o resultado das operações feitas na BD (reservas criadas, pedidos, etc.)
- **Mobile**: ocupa ecrã completo em mobile, janela fixa em desktop

---

### 7.1 Como os Erros do Backend chegam ao Utilizador

Quando o backend envia um evento SSE de erro, o frontend tem 4 ficheiros responsáveis por receber, interpretar e mostrar o erro ao utilizador.

#### Fluxo completo do erro — do SSE ao ecrã

```
Backend envia evento SSE de erro:
  event: rate_limit
  data: {"success":false,"errorType":"RATE_LIMIT","message":"Limite de pedidos..."}
        │
        ▼
[1] chatService.js — sendMessageToBotStream (linhas 82–95)
    detecta evento de erro → chama onDone com providerError: true
        │
        ▼
[2] ChatUI.jsx — makeOnDone (linha 156–163)
    payload.success === false → actualiza mensagem do bot com providerError
        │
        ▼
[3] ChatUI.jsx — render (linhas 311–320)
    msg.providerError existe → renderiza <ProviderErrorCard>
        │
        ▼
[4] ProviderErrorCard.jsx + providerErrorCardUtils.js
    ERROR_CONFIG[errorType] → ícone + cor + título + mensagem + botão retry
```

---

#### Ficheiro 1 — `frontend/src/services/chatService.js`

**Papel:** Lê o stream SSE linha a linha e distingue eventos normais de eventos de erro.

`frontend/src/services/chatService.js` — linhas 70–118
```js
const flush = () => {
  if (!event) return;
  const parsed = JSON.parse(data);

  if (event === "message") {
    if (parsed?.text) onChunk(parsed.text);  // ← fragmento de texto normal

  } else if (event === "done") {
    if (onDone) onDone(parsed);              // ← sucesso, mensagem completa

  } else if (
    event === "provider_error"   ||
    event === "rate_limit"       ||
    event === "service_unavailable" ||
    event === "auth_error"       ||
    event === "network_error"    ||
    event === "invalid_request"
  ) {
    // ← evento de erro do backend → marca como providerError
    if (onDone) onDone({
      ...parsed,
      success:       false,
      providerError: true,   // flag que o ChatUI usa para mostrar o card de erro
    });
  }

  event = null;
  data  = "";
};
```

Há também tratamento de erros **antes** do stream (HTTP 4xx/5xx):

`frontend/src/services/chatService.js` — linhas 39–63
```js
// Se o servidor retornar erro HTTP antes de abrir o stream
if (!response.ok) {
  const body        = await response.json();
  const errorType   = httpStatusToErrorType(response.status); // 429 → "RATE_LIMIT"
  const serverMessage = body?.error || body?.message || `Erro ${response.status}`;

  if (onDone) onDone({
    success:       false,
    providerError: false,   // erro HTTP, não de provider AI
    errorType,
    message: serverMessage,
  });
  return;
}
```

E erros de **rede total** (sem resposta):

`frontend/src/services/chatService.js` — linhas 145–162
```js
} catch (err) {
  // fetch falhou completamente — sem resposta do servidor
  const isTimeout = err?.name === "AbortError" || err?.message?.includes("timeout");

  if (onDone) onDone({
    success:       false,
    providerError: false,
    errorType:     isTimeout ? "TIMEOUT" : "NETWORK_ERROR",
    message:       isTimeout
      ? "O pedido demorou demasiado tempo. Tente novamente. ⏱️"
      : "Não foi possível ligar ao servidor. Verifique a sua ligação à internet. 🌐",
  });
}
```

---

#### Ficheiro 2 — `frontend/src/components/chat/ChatUI.jsx`

**Papel:** Recebe o payload de erro via `onDone` e actualiza a mensagem do bot com o campo `providerError`.

`frontend/src/components/chat/ChatUI.jsx` — linhas 108–165 (`makeOnDone`)
```jsx
const makeOnDone = (botMsgId) => (payload) => {
  setLoading(false);

  // Caso de sucesso: guarda no histórico
  if (payload?.success && payload?.message) {
    setConversationHistory(prev => [...prev, { role: "assistant", content: payload.message }]);
  }

  // Caso de erro: marca a mensagem do bot com providerError
  if (!payload?.success) {
    setMessages(p =>
      p.map(m =>
        m.id === botMsgId
          ? {
              ...m,
              text: "",          // apaga qualquer texto parcial que tenha chegado
              providerError: {
                errorType: payload.errorType || "SERVER_ERROR",
                message:   payload.message   || "Erro inesperado.",
              }
            }
          : m
      )
    );
  }
};
```

A mensagem do bot é criada inicialmente com `providerError: null` (linha 181):
```jsx
{ id: botMsgId, text: "", sender: "bot", timestamp: new Date(), providerError: null }
```

Quando o erro chega, o `providerError` é preenchido — o `text` fica vazio e o card de erro aparece no lugar da mensagem.

---

#### Ficheiro 3 — `frontend/src/components/chat/ChatUI.jsx` (render)

**Papel:** Verifica se `msg.providerError` existe e renderiza o `ProviderErrorCard` em vez do texto.

`frontend/src/components/chat/ChatUI.jsx` — linhas 306–321
```jsx
{messages.map((msg) => (
  <div key={msg.id}>

    {/* Mensagem normal de texto */}
    {(msg.text || msg.menuItems) && (
      <ChatBubbleUI message={msg} sender={msg.sender} onOrder={handleMenuOrder} />
    )}

    {/* Card de erro — aparece quando providerError está preenchido */}
    {msg.providerError && (
      <div className="flex justify-start mt-1">
        <div className="max-w-[280px] w-full">
          <ProviderErrorCard
            errorType={msg.providerError.errorType}  // "RATE_LIMIT", "TIMEOUT", etc.
            message={msg.providerError.message}       // mensagem em PT do backend
            onRetry={handleRetry}                     // reenviar a última mensagem
          />
        </div>
      </div>
    )}
  </div>
))}
```

O `handleRetry` (linha 211) remove a última mensagem do bot e reenvia a última mensagem do utilizador:
```jsx
const handleRetry = async () => {
  if (!lastUserMessage || loading) return;
  setMessages(p => {
    const lastBotIdx = [...p].reverse().findIndex(m => m.sender === "bot");
    const idx = p.length - 1 - lastBotIdx;
    return p.filter((_, i) => i !== idx && i !== idx - 1); // remove bot + user
  });
  await doSend(lastUserMessage); // reenvia
};
```

---

#### Ficheiro 4 — `ProviderErrorCard.jsx` + `providerErrorCardUtils.js`

**Papel:** Componente visual que apresenta o erro com ícone, cor, título e botão de retry.

`frontend/src/utils/providerErrorCardUtils.js` — linhas 1–44
```js
export const ERROR_CONFIG = {
  SERVICE_DOWN:    { icon: "🔧", color: "#F97316", title: "Serviço em baixo",      bg: "#FFF7ED", border: "#FED7AA" },
  RATE_LIMIT:      { icon: "⏳", color: "#EAB308", title: "Limite atingido",        bg: "#FEFCE8", border: "#FEF08A" },
  AUTH_ERROR:      { icon: "🔑", color: "#EF4444", title: "Erro de autenticação",  bg: "#FEF2F2", border: "#FECACA" },
  NETWORK_ERROR:   { icon: "🌐", color: "#6366F1", title: "Sem ligação",            bg: "#EEF2FF", border: "#C7D2FE" },
  INVALID_REQUEST: { icon: "✏️", color: "#8B5CF6", title: "Pedido inválido",        bg: "#F5F3FF", border: "#DDD6FE" },
  UNKNOWN:         { icon: "🤖", color: "#6B7280", title: "IA indisponível",        bg: "#F9FAFB", border: "#E5E7EB" },
};
```

`frontend/src/components/chat/ProviderErrorCard.jsx` — linhas 7–44
```jsx
export function ProviderErrorCard({ errorType = "UNKNOWN", message, onRetry }) {
  const cfg = ERROR_CONFIG[errorType] || ERROR_CONFIG.UNKNOWN; // fallback para UNKNOWN

  return (
    <div style={{ background: cfg.bg, border: `1px solid ${cfg.border}`, borderLeft: `3px solid ${cfg.color}` }}
         className="rounded-xl p-3 text-sm">

      {/* Cabeçalho: ícone + título */}
      <div className="flex items-center gap-2 mb-1.5">
        <span>{cfg.icon}</span>
        <span style={{ color: cfg.color }}>{cfg.title}</span>
      </div>

      {/* Mensagem vinda do backend em português */}
      <p className="text-xs text-gray-600 leading-relaxed mb-2">{message}</p>

      {/* Botão retry — só aparece se onRetry foi passado */}
      {onRetry && (
        <button onClick={onRetry} style={{ background: cfg.color, color: "#fff" }}>
          ↺ Tentar novamente
        </button>
      )}
    </div>
  );
}
```

---

#### Resumo dos 4 ficheiros do frontend

| Ficheiro | Papel | Entrada | Saída |
|----------|-------|---------|-------|
| `chatService.js` | Lê SSE e detecta eventos de erro | Evento SSE do backend | `onDone({ success: false, providerError: true, errorType, message })` |
| `ChatUI.jsx` `makeOnDone` | Actualiza estado da mensagem | Payload `onDone` | `msg.providerError = { errorType, message }` |
| `ChatUI.jsx` render | Decide o que renderizar | `msg.providerError` | `<ProviderErrorCard>` em vez de texto |
| `ProviderErrorCard.jsx` + `providerErrorCardUtils.js` | Mostra o erro visualmente | `errorType` + `message` | Card com ícone, cor, mensagem PT e botão retry |

---

## 8. UX/UI e Responsividade

### Abordagem mobile-first

Todas as páginas têm dois layouts distintos:

Padrão Tailwind usado em todas as páginas com classes responsivas (`sm:hidden` / `hidden sm:inline`):

`frontend/src/pages/MenuPage.jsx` — linhas 106–160 (`GestaoCard` para mobile, `GestaoRow` para desktop)
`frontend/src/pages/ClientesPage.jsx` — linhas 663–696 (grid mobile vs desktop)
```jsx
// Mobile: cards em grid (sm:hidden — só visível em mobile)
<div className="sm:hidden grid grid-cols-5 gap-2">
  {items.map(item => <MobileCard key={item.id} item={item} />)}
</div>

// Desktop: tabela (hidden sm:grid — só visível a partir de sm)
<div className="hidden sm:grid sm:grid-cols-5 gap-2">
  <table className="w-full">
    <thead>...</thead>
    <tbody>...</tbody>
  </table>
</div>
```

### Navegação adaptada

| Dispositivo | Componente | Comportamento |
|-------------|-----------|---------------|
| Desktop | `Header` | Barra lateral ou superior com links |
| Mobile | `BottomNav` | Navegação por tabs na parte inferior |

### Padrões de UX consistentes em todas as páginas

| Padrão | Implementação |
|--------|--------------|
| Estado de carregamento | Spinner `react-loading-indicators` enquanto dados carregam |
| Confirmação de acções destrutivas | Modal de confirmação antes de eliminar |
| Feedback visual de acções | Badges de estado com cores semânticas |
| Auto-refresh | `setInterval` de 30s nas páginas operacionais |
| Pesquisa | Input de texto filtra lista em tempo real (client-side) |
| Paginação | Componente partilhado com tamanho de página configurável |
| Edição inline | Click-to-edit sem modal — mais rápido para operações frequentes |
| Animações | Framer Motion em entradas de modal e transições de tab |

### Dark/Light mode

`ThemeContext` gere o tema globalmente. Tailwind aplica classes `dark:` para cada elemento.

### Boas práticas aplicadas (refactor)

| Anti-pattern | Correcção aplicada |
|---|---|
| `onMouseEnter/onMouseLeave` (13 ficheiros) | Substituídos por Tailwind `hover:` classes e CSS `.kds-card:hover` |
| Valores derivados sem `useMemo` | `useMemo` adicionado em `MainPage` e `ProfilePage` para `cartItems`, `groupedAll`, `filteredItems`, `unpaidInvoices`, `catEntries`, etc. |

---

## 6.5 MainPage — Cardápio Digital

**Ficheiro:** `frontend/src/pages/MainPage.jsx`

Landing page pública que serve tanto visitantes como clientes autenticados.

### Funcionalidades

| Utilizador | O que vê |
|---|---|
| Visitante (não autenticado) | Cardápio completo, botões Login/Registar no header (desktop) ou BottomNav |
| Cliente autenticado (role 2) | Cardápio + botão "Adicionar ao pedido" em cada card + carrinho flutuante |

### Carrinho de compras (clientes autenticados)

- Cada `ItemCard` mostra "+ Adicionar ao pedido" quando `user.role_id !== 1`
- Ao adicionar itens, aparece um **botão flutuante** (estilo do chatbot) com ícone `fa-basket-shopping` e badge com contagem
- Clicar abre o **CartModal** — lista de itens com quantidades, total e botão "Confirmar pedido"
- Ao confirmar:
  1. `orderService.create({ service_type: "Takeaway", order_status: "In Preparation", kitchen_sequence_json })` 
  2. `orderItemService.createBulk({ order_id, items: [{item_id, quantity}] })` — guarda itens na DB para cálculos financeiros e KDS

### BottomNav condicional

| Estado | BottomNav |
|---|---|
| Não autenticado | Tab "MOSTRAR MENU" → drawer com Login + Registar |
| Autenticado (role 2) | Tab "MOSTRAR MENU" → drawer com Meu Perfil + Sair |
| Header (≥sm) | Botões Login/Registar escondidos com `hidden sm:flex` quando BottomNav os mostra |

---

## 6.6 ProfilePage — Perfil do Cliente

**Ficheiro:** `frontend/src/pages/ProfilePage.jsx`

Acessível a todos os utilizadores autenticados (`/perfil`). Redireciona admins para `/dashboard`.

### Funcionalidades

- **Stats**: Total gasto, Nº pedidos, Valor médio, Categoria top
- **Banner de faturas pendentes**: aparece automaticamente se há faturas por pagar — total consolidado + botão "Pagar"
- **Histórico de pedidos**: tabela paginada com Data, Estado, Tipo, Total
- **Gráficos**: Doughnut (gastos por categoria) + Line (valor por categoria) — calculados via `orderItemService.getByOrder()` com fallback para `kitchen_sequence_json`
- **Editar dados**: botão no header → `EditProfileModal` com campos Nome, Username, Email, Telefone; guarda via `customerService.update()` e actualiza o `AuthContext` com `updateUser()`
- **Zona de perigo**: solicitar remoção de conta (envia notificação ao admin)

### PaymentModal — Pagar tudo de uma vez

O modal consolida **todas as faturas pendentes** num único pagamento:

```js
// Cria um payment por fatura + marca cada pedido como Delivered
await Promise.all(
  unpaidInvoices.map(({ inv, orderId }) =>
    paymentService.create({
      invoice_id: inv.id, customer_id, amount, payment_method, payment_status: "Completed"
    }).then(() => orderService.updateStatus(orderId, "Delivered"))
  )
);
```

Métodos de pagamento aceites: `MB Way`, `Multibanco`, `Credit Card`, `Cash`.

### BottomNav do MainLayout (role 2)

Quando um cliente (role 2) está em `/perfil` (dentro do MainLayout), o BottomNav mostra:
- Tab "MOSTRAR MENU" → drawer com **Cardápio** + **Sair**
- Sem links de admin (Dashboard, Mesas, KDS, etc.)

---

## 9. Notificações — Bell no Header

**Ficheiro:** `frontend/src/components/ui/Header.jsx` — componente `NotificationBell`

Bell icon no header para todos os utilizadores autenticados:

- **Badge vermelho** (#FF3B30) com contagem de não lidas
- **Dropdown** ao clicar: lista de notificações com borda esquerda vermelha (não lidas) / opacidade 65% (lidas)
- Clicar numa notificação → marca como lida via `customerService.markNotificationRead()`
- Notificações com palavras-chave de pagamento mostram botão **"Pagar"** que navega para `/perfil`
- **Polling a cada 30 segundos** para actualizar o badge
- **Mobile**: dropdown usa `position: fixed` com `left-4 right-4` e `top: 3.6rem`; desktop usa `position: absolute right-0`

---

## 10. Fluxo Completo Cliente

```
1. Cliente abre MainPage (cardápio público)
2. Faz login via modal ou BottomNav
3. Adiciona itens ao carrinho (botão "+ Adicionar ao pedido" nos cards)
4. Clica no botão flutuante da cesta → CartModal
5. Confirma pedido → POST /orders (In Preparation) + POST /order-items/bulk
6. KDS do admin processa o pedido (timer auto-avança)
7. Pedido chega a "Ready" → backend cria fatura automaticamente (IVA 13%) + notificação ao cliente
8. Bell do cliente fica com badge vermelho
9. Cliente clica no bell → vê notificação "Pedido pronto — pagar X€"
10. Clica "Pagar" → navega para /perfil
11. Banner "X faturas pendentes" aparece → clica "Pagar"
12. PaymentModal: selecciona método, confirma
13. Backend cria payments + actualiza pedidos para "Delivered"
14. KDS move pedidos para coluna "Entregue"
```

---

> **Resumo para a defesa:**
> O frontend do SmartBistro é uma SPA React com routing protegido por roles, service layer abstraído, e integração SSE com o chatbot AI. A responsividade é implementada com dois layouts distintos (tabela/cards) em cada página. A autenticação usa JWT guardado em localStorage com validação automática no arranque. O chatbot recebe texto em streaming palavra a palavra através de SSE, com tratamento de erros tipado por evento.
