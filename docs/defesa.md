# SmartBistro AI — Preparação para a Defesa

> Guia de perguntas e respostas simulando o júri.
> Baseado nos critérios de avaliação do Projecto Final (Ciências ULisboa).

---

## Critérios e Pesos

| Critério | Peso | O que avaliam |
|----------|------|--------------|
| Arquitetura & Backend | 10% | Estrutura da API, rotas, validações e organização |
| Integração MySQL | 10% | Modelação relacional e CRUD |
| Frontend, UX/UI & Responsividade | 10% | Experiência do utilizador e integração frontend/backend |
| Integração Agentic AI API | 15% | Originalidade e relevância da funcionalidade inteligente |
| Boas Práticas & Git | 5% | Organização, README e qualidade do código |
| Entrega / Defesa Intermédia | 10% | Qualidade da proposta e evolução apresentada |
| **Apresentação & Defesa Final** | **40%** | Capacidade individual de explicar e defender o projecto |

---

## 1. Arquitectura & Backend (10%)

**O que têm de ver:** Estrutura da API, rotas, validações e organização.

---

**P: Explica a arquitectura geral do backend.**

R: O backend é uma API REST em Node.js com Express. Está organizado em 3 camadas: **rotas** (definem os endpoints), **controllers** (tratam a lógica HTTP e validação) e **services** (acedem à base de dados). Por cima disso há uma camada de **GenAI** com os agentes de IA e o orquestrador. A comunicação com o frontend é feita via HTTP normal para operações CRUD e via SSE (Server-Sent Events) para o streaming do chatbot.

---

**P: Como estão organizadas as rotas?**

R: Cada entidade tem o seu próprio ficheiro de rotas — `authRoutes.js`, `orderRoutes.js`, `chatRoutes.js`, etc. Todas são registadas no `app.js` com um prefixo — por exemplo `/auth`, `/orders`, `/chatbot`. Dentro de cada ficheiro de rota aplicam-se os middlewares necessários, como `verifyToken` para rotas autenticadas e `requireRole(1)` para rotas de administrador.

---

**P: Como funciona a validação no backend?**

R: Há três níveis de validação:
1. **Middleware de existência** — `createExistsMiddleware` verifica se o recurso existe antes de qualquer operação, devolve 404 automaticamente se não existir.
2. **Validação no controller** — campos obrigatórios, tipos e enums validados antes de qualquer chamada à BD ou IA.
3. **Validação de schema Zod** — as respostas dos agentes AI são validadas com schemas Zod antes de serem usadas, garantindo que o JSON do LLM tem a estrutura esperada.

---

**P: Como é feita a autenticação?**

R: JWT (JSON Web Token) com bcrypt para passwords. No registo, a password é cifrada com bcrypt (10 salt rounds). No login, verifica-se com `bcrypt.compare`. O token gerado dura 8 horas e contém apenas `{ id, role_id }` — nunca dados sensíveis. Todas as rotas protegidas passam pelo middleware `verifyToken` que extrai e valida o token do header `Authorization: Bearer <token>`.

---

**P: Porque é que tens dois sistemas de autenticação — `users` e `auth_accounts`?**

R: Para separar o conceito de "cliente do restaurante" do conceito de "utilizador com conta". Um cliente pode ser criado pelo Maître AI (via pipeline de pedidos) sem ter conta. Quando esse cliente depois se regista, a nova conta é ligada ao cliente existente — não cria duplicado. Isto garante que o histórico de pedidos fica associado mesmo que o cliente tenha feito pedidos antes de ter conta.

---

## 2. Integração MySQL (10%)

**O que têm de ver:** Modelação relacional e CRUD.

---

**P: Quantas tabelas tens e como estão relacionadas?**

R: Tenho mais de 10 tabelas. As principais relações são:
- `users` ← `auth_accounts` (1:1) — conta ligada ao cliente
- `users` → `orders` (1:N) — um cliente tem vários pedidos
- `orders` → `order_items` → `items` (N:M) — pedido tem vários itens do menu
- `orders` → `invoices` → `payments` (1:1:1) — fatura e pagamento por pedido
- `orders` → `tables` (N:1) — pedido numa mesa
- `items` → `recipe_items` → `ingredients` → `stock` (N:M) — receita e inventário
- `users` → `reservations` → `tables` — reservas

---

**P: O CRUD está completo em todas as entidades?**

R: Sim. Todas as entidades principais têm os 4 verbos HTTP: GET (listar e obter por ID), POST (criar), PUT/PATCH (actualizar) e DELETE (eliminar). Para além disso há operações específicas como actualização de estado (`PATCH /orders/:id/status`) e o endpoint especial `POST /orders/pipeline` que usa AI para criar um pedido completo.

---

**P: Como garantes a integridade referencial?**

R: Ao nível da BD com foreign keys e `ON DELETE` adequado. Ao nível do código, antes de qualquer operação que depende de outro recurso existe um middleware de existência (`createExistsMiddleware`) que verifica e devolve 404 antes de chegar ao controller. Por exemplo, não é possível criar um `order_item` para um pedido que não existe.

---

**P: Como são calculados os totais da fatura?**

R: Em JavaScript puro, nunca pelo modelo de IA. A função `calculateInvoiceTotals` em `financialUtil.js` calcula: subtotal → desconto → base tributável → IVA → total. O IVA segue as taxas portuguesas de restauração: 13% para refeições, 23% para álcool, 6% para bens essenciais. O `roundMoney` usa `Number.EPSILON` para evitar erros de vírgula flutuante típicos do JavaScript.

---

## 3. Frontend, UX/UI & Responsividade (10%)

**O que têm de ver:** Experiência do utilizador e integração frontend/backend.

---

**P: Qual é o stack do frontend?**

R: React 19 com Vite como build tool, Tailwind CSS para estilos, React Router para a SPA. Não usei Redux ou bibliotecas externas de estado — apenas Context API para autenticação e tema. Para fetch usei o `fetch` nativo e SSE nativo, sem Axios.

---

**P: Como funciona o routing e a protecção de rotas?**

R: Há 3 níveis: rotas públicas (`/`, `/login`), `ProtectedRoute` para utilizadores autenticados (`/perfil`), e `AdminRoute` para administradores (`/dashboard`, `/orders`, etc.). O `ProtectedRoute` verifica o `AuthContext` — se não há utilizador, redireciona para `/`. O `AdminRoute` verifica `role_id === 1`. Todas as páginas são carregadas com `lazy()` + `Suspense` para code splitting.

---

**P: Como é a responsividade?**

R: Mobile-first com Tailwind. Cada página operacional tem dois layouts distintos: tabela para desktop e cards para mobile. A navegação adapta-se — `Header` em desktop, `BottomNav` (tabs em baixo) em mobile. O chatbot expande para ecrã completo em mobile e é uma janela fixa em desktop.

---

**P: Como é feita a integração frontend-backend?**

R: Através de uma service layer com 16 services que extendem `BaseService`. Este abstrai o `fetch` com autenticação automática (injeta o JWT do `localStorage` em cada pedido). O URL base é configurável por variável de ambiente — em desenvolvimento usa `http://localhost:3000` via proxy Vite, em produção usa `/api`.

---

**P: Que padrões de UX usaste?**

R: Auto-refresh de 30 segundos nas páginas operacionais para dados em tempo real. Edição inline de preços e quantidades (clica no valor, edita, Enter para guardar). Confirmação antes de apagar. Badges de estado com cores semânticas. Pesquisa client-side em tempo real. Paginação partilhada. Animações com Framer Motion em modais. Bell de notificações no header com polling de 30s. Carrinho flutuante estilo FAB (Floating Action Button). Modais bottom-sheet em mobile para carrinho e pagamento.

---

**P: Como é que um cliente faz um pedido sem passar pelo chatbot?**

R: Através do cardápio digital na MainPage. Quando um cliente com role 2 está autenticado, cada card do menu mostra um botão "Adicionar ao pedido". Ao adicionar itens, aparece um botão flutuante com ícone de cesta e badge com a contagem. Ao clicar abre um modal com a lista de itens, quantidades ajustáveis e total. Ao confirmar, o frontend cria o pedido com status "In Preparation" (saltando o Chef AI, já que o kitchen_sequence_json está preenchido) e guarda os order_items via createBulk para que o KDS e os relatórios funcionem correctamente.

---

**P: Como são geradas as faturas?**

R: Automaticamente pelo backend quando o status do pedido muda para "Ready". O controller `updateStatus` detecta este estado, verifica se já existe fatura (para evitar duplicados), calcula os totais com `calculateInvoiceTotals` usando IVA de 13% (taxa intermédia da restauração em Portugal), cria a fatura na BD e envia uma notificação ao cliente com o valor a pagar. Nunca é preciso intervenção manual do staff para criar faturas.

---

**P: Como funciona o sistema de notificações ao cliente?**

R: Há um bell icon no header de todas as páginas autenticadas. Faz polling a cada 30 segundos via `userService.getNotifications()`. Quando uma notificação chega (por exemplo "Pedido pronto — pagar 28.82€"), o badge vermelho aparece no bell. O cliente clica, vê a notificação com botão "Pagar" que o leva para o perfil. No perfil, um banner verde mostra o total de faturas pendentes e permite pagar tudo de uma vez com um único clique.

---

**P: Como garantes que um pedido Takeaway só é entregue depois de pago?**

R: No KDS, o auto-avance de "Ready" para "Delivered" está bloqueado para pedidos com `service_type === "Takeaway"`. O pedido fica em "Ready" até o cliente confirmar o pagamento. Quando o `PaymentModal` é confirmado, o frontend cria o(s) pagamento(s) e chama `orderService.updateStatus(orderId, "Delivered")` para cada pedido pago, movendo-os para a coluna "Entregue" no KDS.

---

**P: Aplicaste boas práticas de performance no frontend?**

R: Sim. Usei `useMemo` para memorizar valores derivados pesados — em `MainPage` para `groupedAll`, `filteredItems`, `cartItems`, `cartTotal`, `cartCount`; em `ProfilePage` para `unpaidInvoices`, `totalGasto`, `catEntries`. Removi todos os `onMouseEnter/onMouseLeave` (anti-pattern de manipulação directa do DOM) de 13 ficheiros, substituindo-os por classes `hover:` do Tailwind e CSS puro (`.kds-card:hover`). O React consegue optimizar renders CSS muito melhor do que manipulação JS directa do DOM.

---

## 4. Integração Agentic AI API (15%)

**O que têm de ver:** Originalidade e relevância da funcionalidade inteligente.

---

**P: O que é uma Agentic AI API e como a usaste?**

R: Uma Agentic AI é um modelo de linguagem que não só gera texto mas também chama funções — toma decisões sobre que acção executar e executa-a. No SmartBistro, o chatbot tem 19 funções disponíveis (criar pedido, fazer reserva, verificar stock, etc.) e decide autonomamente quais chamar com base na conversa. Pode encadear até 5 chamadas em sequência — por exemplo: verificar se a mesa está disponível → criar reserva → confirmar ao utilizador.

---

**P: Explica o pipeline de 3 agentes.**

R: Para processar um pedido em linguagem natural, uso 3 agentes especializados em sequência:
1. **Maître** (temperatura 0.4): interpreta "eu e a minha esposa queremos jantar, esparguete e hambúrguer" → JSON com mesa, itens e preços do menu real.
2. **Chef** (temperatura 0.2): verifica stock de cada item, cria a sequência de preparação por secção de cozinha, estima o tempo.
3. **Manager** (temperatura 0.3): recebe os totais PRÉ-CALCULADOS em JS e formata a fatura final.

Cada agente tem temperatura diferente — Maître precisa de criatividade para interpretar linguagem vaga, Chef e Manager precisam de precisão técnica.

---

**P: A IA calcula os preços?**

R: Não, nunca. Os valores financeiros são sempre calculados por funções JS puras (`calculateInvoiceTotals`). O Manager recebe os totais já calculados e apenas formata — não faz aritmética. Esta decisão de design foi intencional porque LLMs cometem erros com números, especialmente com IVA e descontos encadeados.

---

**P: O que acontece se um item não tiver stock?**

R: O Chef reporta os itens indisponíveis. O sistema envia feedback ao Maître com a lista de itens em falta e pede-lhe para ajustar o pedido com alternativas disponíveis. O Chef valida novamente. Se após este ciclo ainda houver itens indisponíveis, o sistema devolve um erro 400 com a lista exacta de itens em falta — nunca cria um pedido com stock insuficiente.

---

**P: O que acontece se o Groq cair?**

R: O sistema tem uma fila de 8 modelos em fallback: llama-3.3-70b → openai/gpt-oss-120b → openai/gpt-oss-20b → llama-4-scout → qwen3-32b → groq/compound → llama-3.1-8b → groq/compound-mini. Se um modelo retornar 429 (rate limit), 502 ou 503, tenta automaticamente o próximo. Só falha quando todos os 8 estão indisponíveis — e nesse caso devolve uma mensagem em português ao utilizador explicando a situação.

---

**P: Como funciona o streaming do chatbot?**

R: O backend abre uma ligação SSE (Server-Sent Events). O Groq devolve o texto fragmento a fragmento (chunk by chunk). O backend envia cada fragmento como um evento SSE ao frontend. O frontend recebe e acrescenta ao texto exibido — o utilizador vê o texto a aparecer palavra a palavra, como num chat real. Há também um timeout de 45 segundos implementado com `Promise.race` para evitar que a ligação fique suspensa indefinidamente.

---

**P: O que são as tags `<think>` e como as tratas?**

R: Alguns modelos (Qwen3, modelos OpenAI com reasoning) escrevem o seu raciocínio interno antes de responder, dentro de tags `<think>...</think>`. O utilizador não deve ver este raciocínio. O `createThinkTagFilter` em `groqUtil.js` filtra estas tags durante o streaming em tempo real — acumula o conteúdo das tags num buffer mas só emite para o cliente o texto fora das tags. O raciocínio fica disponível internamente para debug.

---

**P: Como são tratados os erros do chatbot e como chegam ao utilizador?**

R: O sistema tem 4 camadas de tratamento de erros encadeadas:

**Camada 1 — Origem do erro** (`BaseChatProcessor.js` `_streamRound`):
O erro pode nascer em 3 pontos: timeout de 45s (via `Promise.race` com `makeTimeout`), modelo Groq a retornar 4xx/5xx (tentando os 8 modelos da fila primeiro), ou função não registada no `FUNCTION_HANDLERS`.

**Camada 2 — Classificação** (`classifyError.js` `classifyGroqError`):
Qualquer erro técnico é transformado num tipo estruturado com mensagem em português:
- HTTP 429 → `RATE_LIMIT` → "Limite de pedidos atingido..."
- HTTP 503 → `SERVICE_DOWN` → "Serviço de IA indisponível..."
- HTTP 401 → `AUTH_ERROR` → "Erro de autenticação..."
- Timeout → `TIMEOUT` → "O assistente demorou demasiado..."
- Rede → `NETWORK_ERROR` → "Não foi possível ligar..."

**Camada 3 — Encapsulamento** (`pipelineError.js` `PipelineError`):
O erro classificado é embrulhado num `PipelineError` com `code`, `stage` e `groqType` para rastreabilidade. É passado ao controller via callback `onError`.

**Camada 4 — Envio ao cliente** (`chatBotUtil.js` `writeSseError`):
O controller chama `writeSseError(res, err)` que envia um evento SSE tipado e fecha a ligação:
```
event: rate_limit
data: {"success":false,"errorType":"RATE_LIMIT","message":"Limite de pedidos atingido..."}
```

O frontend (`ProviderErrorCard.jsx`) escuta estes eventos tipados e mostra a mensagem em português com botão de retry. O utilizador nunca vê um erro técnico — vê sempre uma mensagem compreensível.

Há também dois casos especiais que **não são erros mas recuperações automáticas**: se o LLM devolver stream vazio, o sistema faz uma segunda tentativa com um hint; se o loop agêntico atingir 5 passos, devolve a melhor resposta parcial via `synthesizeFallbackMessage` em vez de falhar.

---

## 5. Boas Práticas & Git (5%)

**O que têm de ver:** Organização, README e qualidade do código.

---

**P: Qual é a estrutura de commits Git?**

R: Usei conventional commits com prefixos semânticos: `feat` para novas funcionalidades, `fix` para correcções, `refactor` para reestruturação sem mudança de comportamento, `chore` para manutenção, `merge` para merges de branches. Por exemplo: `feat(auth/ui): modais login/registo polidos` ou `refactor(utils): mover constantes inline para utils`.

---

**P: Como está organizado o código?**

R: Backend em 3 camadas (routes → controllers → services) com a camada GenAI separada. Frontend em componentes, páginas, services, context e utils. Sem comentários desnecessários — o código é auto-descritivo por nomes. Middlewares reutilizáveis como `createExistsMiddleware` para evitar repetição. Utils puramente funcionais (sem side effects) para cálculos financeiros e normalização.

---

**P: Usaste branches?**

R: Sim. A funcionalidade principal da IA foi desenvolvida na branch `feature/groq` antes de ser integrada no `main`. A responsividade mobile foi desenvolvida em `feature/mobile`. O histórico de commits mostra a evolução incremental do projecto.

---

## 6. Perguntas Difíceis — O Júri vai querer saber

---

**P: Qual foi a maior dificuldade técnica?**

R: O streaming SSE com function calling simultâneo. O Groq envia o texto e as chamadas de função no mesmo stream, em fragmentos. Tive de acumular os fragmentos das tool_calls (que chegam indexados) enquanto também filtrava as tags `<think>` do texto visível, e garantir que os IDs das tool_calls nunca ficavam vazios (porque o Groq valida isso na chamada seguinte e retorna 400 se o ID estiver vazio).

---

**P: O que mudarias se voltasses a fazer o projecto?**

R: Adicionaria testes automatizados, especialmente para o pipeline de agentes. Os testes de integração são cruciais aqui porque a lógica de fallback de modelos e o loop de correcção de stock têm muitos caminhos possíveis. Também consideraria TypeScript para o backend para ter tipos nas respostas dos agentes.

---

**P: Como garantes que o bot não alucina dados do menu?**

R: Depois da resposta do Maître, a função `enforceMenuPrices` percorre todos os itens que o agente devolveu e substitui os preços pelos preços reais da base de dados. O agente pode errar o preço, mas o sistema corrige antes de avançar. Para os itens, o Maître recebe o menu completo no prompt e tem de mapear os itens pedidos aos IDs reais — se não conseguir, devolve `validation_status: "invalid"` e o pipeline para.

---

**P: Qual é a diferença entre o chatbot e o pipeline de pedidos?**

R: São dois sistemas distintos. O **chatbot** é conversacional — o utilizador fala com o bot em linguagem natural, o bot chama funções da BD para responder e pode fazer pedidos, reservas, etc., tudo numa conversa. O **pipeline** é para o staff de sala — recebe um pedido em linguagem natural, corre os 3 agentes em sequência, e cria todos os registos na BD (pedido + itens + fatura + pagamento) numa só operação.

---

**P: Como funciona o KDS?**

R: O KDS (Kitchen Display System) é o ecrã da cozinha. Quando o staff clica em "Iniciar" num pedido Pending, o endpoint `POST /orders/:id/chef-start` é chamado. O Chef AI analisa os itens, gera a sequência de preparação por secção (forno, grelha, fritura...), estima o tempo (clampado entre 10s e 120s para evitar tempos irrealistas), e muda o estado do pedido para "In Preparation". O resultado inclui a sequência exacta de preparação.

---

## 7. Resumo — O que dizer se perguntarem "descreve o projecto em 2 minutos"

> "O SmartBistro AI é um sistema de gestão para restaurantes com inteligência artificial integrada. O frontend é uma SPA React com Tailwind, com páginas para gerir clientes, menu, pedidos e stock, todas responsivas com versão mobile. O backend é uma API REST em Node.js/Express com MySQL, organizado em controllers, services e uma camada de IA. A parte mais inovadora é a integração com o Groq — tenho dois sistemas de IA: um chatbot que usa function calling para interagir com a base de dados em tempo real, e um pipeline de 3 agentes que transforma um pedido em linguagem natural num registo completo na base de dados com fatura e pagamento. Os agentes são especializados: o Maître interpreta a linguagem, o Chef verifica o stock e cria a sequência de cozinha, e o Manager confirma a fatura. Os valores financeiros são sempre calculados em JavaScript puro — a IA nunca faz aritmética. O sistema tem fallback automático entre 8 modelos de IA e tratamento de erros em português para todas as situações."
