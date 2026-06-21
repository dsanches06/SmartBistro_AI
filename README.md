# SmartBistro AI

Sistema fullstack de gestão de restaurante com inteligência artificial integrada. O backend processa pedidos em linguagem natural através de um pipeline de 3 agentes AI (Maître, Chef, Manager), serve um chatbot com streaming SSE e function calling, e expõe uma API REST completa. O frontend é uma SPA React com routing protegido por roles, carrinho digital e integração SSE com o chatbot.

---

## Instalação

### Pré-requisitos

- Node.js 20+
- MySQL 8+
- Conta Groq (chave API gratuita em [console.groq.com](https://console.groq.com))

### 1. Clonar o repositório [link do repo](https://github.com/dsanches06/SmartBistro_AI)

```bash
git clone https://github.com/dsanches06/SmartBistro_AI.git
cd SmartBistro_AI
```

### 2. Instalar dependências

```bash
# Backend
cd backend && npm install

# Frontend
cd ../frontend && npm install
```

### 3. Configurar a base de dados

O repositório inclui o schema e os dados iniciais. No MySQL Workbench (ou cliente equivalente), executar por esta ordem:

```sql
-- 1. Criar as tabelas
SOURCE database/schema.sql;

-- 2. Inserir dados iniciais (menu, roles, etc.)
SOURCE database/seed.sql;
```

### 4. Configurar variáveis de ambiente

```bash
# Backend
cp backend/.env.example backend/.env
```

Editar `backend/.env` com os valores reais (ver secção abaixo).

```bash
# Frontend (opcional — só necessário para personalizar nomes de cookies)
cp frontend/.env.example frontend/.env
```

O frontend comunica com o backend via proxy Vite (`/api` → `http://localhost:3000`). O ficheiro `.env` só é necessário se quiser alterar os nomes dos cookies de autenticação.

---

## Variáveis de ambiente

### `backend/.env`

```env
# ===== SERVER =====
PORT=3000

# ===== DATABASE =====
DB_HOST=localhost
DB_USER=user_name
DB_PASSWORD=user_password
DB_NAME=database_name
DB_PORT=3306

# ===== AUTH =====
JWT_SECRET=change_this_to_a_long_random_secret ou usar smartbistro_jwt_secret_2026

# ===== GROQ AI =====
GROQ_API_KEY=your_groq_api_key
```

| Variável | Obrigatória | Descrição |
|----------|-------------|-----------|
| `DB_*` | Sim | Credenciais MySQL |
| `JWT_SECRET` | Sim | Segredo para assinar tokens JWT (mínimo 27 caracteres) |
| `GROQ_API_KEY` | Sim | Chave da API Groq — obtida em console.groq.com |

### `frontend/.env` (opcional)

```env
VITE_AUTH_TOKEN_KEY=sb_token
VITE_AUTH_LOCK_KEY=sb_auth_lock
VITE_SESSION_ID_KEY=sb_session_id
VITE_AUTH_CHANNEL_NAME=sb_auth_channel
```

Estes valores definem os nomes dos cookies e do BroadcastChannel de autenticação. Os valores por omissão do `.env.example` funcionam sem alterações.

---

## Executar em desenvolvimento

### Backend

```bash
cd backend
npm start
# Servidor em http://localhost:3000
```

### Frontend

```bash
cd frontend
npm run dev
# App em http://localhost:5173
# Proxy /api → http://localhost:3000
```

Ambos devem estar a correr em simultâneo. O frontend comunica com o backend via proxy Vite configurado em `vite.config.js`.

---

## Testes

### Backend — testes de integração

```bash
cd backend
npm test
```

- 19 ficheiros de teste · **261 testes**
- Cobre todos os controllers e middlewares `checkExists`
- BD e JWT 100% mockados — sem dependências externas
- Usa Vitest + Supertest

### Frontend — testes unitários

```bash
cd frontend
npm test
```

- 15 ficheiros de teste · **132 testes**
- Cobre os 16 services do frontend
- Ambiente jsdom simulado — sem servidor necessário
- Usa Vitest + jsdom

---

## Funcionalidades principais

### Pipeline de 3 Agentes AI

`POST /orders/pipeline` — recebe um pedido em linguagem natural e executa:

1. **Maître AI** — interpreta o texto, selecciona itens do menu e atribui mesa
2. **Chef AI** — verifica stock, gera sequência de preparação e estima tempo
3. **Manager AI** — confirma a fatura com valores pré-calculados em JS puro

Os valores financeiros nunca são calculados pelo modelo de IA — são sempre computados por `calculateInvoiceTotals()` com IVA português (13% refeições no local).

### Chatbot com SSE

`POST /chatbot/stream` — chatbot com streaming em tempo real (palavra a palavra) via Server-Sent Events. Usa function calling com 19 funções para interagir com a BD em tempo real (reservas, pedidos, facturas, stock).

### KDS — Kitchen Display System

`POST /orders/:id/chef-start` — o Chef AI analisa os itens do pedido e gera a sequência de preparação com tempo estimado. Pedidos do carrinho digital chegam directamente como "In Preparation".

### Fallback automático de modelos

O sistema tenta automaticamente até 4 modelos Groq em cascata se o modelo principal falhar (429, 503, timeout). O utilizador nunca vê um erro de disponibilidade enquanto houver modelos alternativos.

---

## Roles e acesso

| role_id | Tipo | Acesso |
|---------|------|--------|
| 1 | Admin | Todas as páginas (Dashboard, Orders, KDS, Menu, Stock, Clientes, Faturação, Relatórios) |
| 2 | Cliente | Cardápio público, carrinho, perfil, histórico de pedidos e pagamentos |

---

## Documentação

- [Documentação do Backend](docs/backend.md)
- [Documentação do Frontend](docs/frontend.md)
