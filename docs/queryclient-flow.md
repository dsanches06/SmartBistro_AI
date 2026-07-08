# Fluxo React Query / QueryClient

## 1. Inicialização global do QueryClient

Arquivo: [`frontend/src/main.jsx`](../frontend/src/main.jsx)

- Linha 2: importa `QueryClient` e `QueryClientProvider`
- Linha 6: cria `queryClient` com defaultOptions:
  - `retry: 1`
  - `staleTime: 30_000`
- Linha 11: envolve `<App />` com `<QueryClientProvider client={queryClient}>`

## 2. Uso típico no frontend

- Várias páginas usam `useQuery` para buscar dados do backend:
  - `frontend/src/pages/admin/RelatoriosPage.jsx`
  - `frontend/src/pages/admin/FaturacaoPage.jsx`
  - `frontend/src/pages/admin/DashboardPage.jsx`
- `FaturacaoPage.jsx` também usa `useQueryClient()` para invalidar queries quando cria ou atualiza faturas.

## 3. Principais vantagens no projeto

- Cache de resultados para reduzir chamadas repetidas.
- Revalidação automática ao mudar os dados.
- Permite atualizar dados de forma centralizada com `queryClient.invalidateQueries(...)`.

## 4. Recomendações

- O `QueryClient` global garante que diferentes páginas partilham o mesmo cache.
- Em operações que alteram mesas, pedidos ou faturação, o frontend pode invalidar queries relevantes para refazer `fetch`.
