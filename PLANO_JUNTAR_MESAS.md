# Plano: Juntar Mesas (Table Merging)

## Contexto
Quando um grupo grande (ex: 15 pessoas) chega ao restaurante e nenhuma mesa individual tem capacidade suficiente, o staff precisa de juntar 2 ou mais mesas adjacentes. Actualmente o sistema assume 1 pedido → 1 mesa (relação 1:1). Esta feature permite agrupar mesas, partilhando um único pedido entre elas.

---

## Abordagem: tabela `table_groups` + coluna `group_id` nas orders

### Por que esta abordagem
- Não quebra a estrutura existente de `orders.table_id` (mantida para compatibilidade)
- Permite dissociar mesas facilmente (só apagar a linha do grupo)
- O detail panel e o KDS continuam a funcionar sem alterações profundas

---

## Alterações

### 1. Base de dados

**Ficheiros:** `database/mysql/schema.sql`, `database/neon_vercel/schema_neon.sql`

```sql
-- Grupos de mesas juntadas
CREATE TABLE table_groups (
    id          INT AUTO_INCREMENT PRIMARY KEY,
    created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Cada mesa num grupo
CREATE TABLE table_group_members (
    group_id    INT NOT NULL,
    table_id    INT NOT NULL,
    PRIMARY KEY (group_id, table_id),
    FOREIGN KEY (group_id)  REFERENCES table_groups(id)  ON DELETE CASCADE,
    FOREIGN KEY (table_id)  REFERENCES tables(id)        ON DELETE CASCADE
);

-- Coluna extra em orders para ligar ao grupo
ALTER TABLE orders ADD COLUMN group_id INT NULL REFERENCES table_groups(id) ON DELETE SET NULL;
```

Migração local a correr depois no MySQL.

---

### 2. Backend

**Novos endpoints em** `backend/src/routes/tableRoutes.js`:
```
POST  /tables/groups            → criar grupo (body: { table_ids: [1,2] })
GET   /tables/groups/:groupId   → detalhes do grupo
DELETE /tables/groups/:groupId  → dissolver grupo (liberta as mesas)
```

**Novo controller:** `backend/src/controllers/tableGroupController.js`
- `createGroup`: valida que todas as mesas estão Available, insere `table_groups` + `table_group_members`, marca todas as mesas como Occupied, cria 1 pedido com `group_id` e `table_id = mesa_principal`
- `dissolveGroup`: marca todas as mesas como Available, apaga o grupo

**Atualizar** `backend/src/services/tableService.js` — `getTableDetails`:
- Incluir `group_id` e lista de mesas irmãs no retorno quando a mesa pertence a um grupo

---

### 3. Frontend

#### `frontend/src/pages/admin/TablePage.jsx`

**AtribuirMesaModal — novo passo "Juntar mesas":**
- Se `partySize > bestSingleTable.capacity`: mostrar aviso e botão "Juntar mesas"
- Permitir selecionar uma segunda (ou terceira) mesa Available
- Mostrar capacidade combinada em tempo real
- Ao confirmar: chamar `POST /tables/groups`

**Painel de detalhes:**
- Se mesa pertence a grupo: mostrar badge "🔗 Mesa juntada com T05, T06"
- Botão "Dissolver grupo" (só visível quando a mesa está livre/paga)

#### `frontend/src/components/ui/cards/TableCard.jsx`
- Se `mesa.group_id` existir: mostrar pequeno ícone de link 🔗 no canto do card
- Cor de contorno diferente (ex: roxo) para mesas agrupadas

---

### 4. Fluxo completo

```
Staff seleciona mesa T05 (cap 6) para grupo de 10
  → Sistema avisa: capacidade insuficiente
  → Staff clica "Juntar mesas" → seleciona T06 (cap 6)
  → Capacidade combinada: 12 ≥ 10 ✓
  → POST /tables/groups { table_ids: [5, 6] }
  → Backend cria group, 1 pedido com group_id, ambas as mesas → Occupied
  → Cards T05 e T06 mostram ícone 🔗 e nome do cliente
  → Staff faz pedidos normalmente (mesmo fluxo FazerPedidoModal)
  → Ao fechar: pagar fatura → ambas as mesas → Available → grupo dissolvido
```

---

## Ficheiros a modificar

| Ficheiro | O quê |
|---|---|
| `database/mysql/schema.sql` | Adicionar tabelas `table_groups`, `table_group_members`, coluna `group_id` em `orders` |
| `database/neon_vercel/schema_neon.sql` | Idem (PostgreSQL) |
| `backend/src/routes/tableRoutes.js` | Novas rotas `/groups` |
| `backend/src/controllers/tableGroupController.js` | **Novo ficheiro** |
| `backend/src/services/tableService.js` | `getTableDetails` incluir info do grupo |
| `frontend/src/pages/admin/TablePage.jsx` | AtribuirMesaModal + painel detalhes |
| `frontend/src/components/ui/cards/TableCard.jsx` | Badge de grupo |

---

## Verificação
1. Criar grupo: selecionar T05 + T06 → ambas ficam Occupied com ícone 🔗
2. Painel detalhe de T05: mostra "Juntada com T06"
3. Painel detalhe de T06: mostra "Juntada com T05"
4. FazerPedidoModal: funciona normalmente (mesmo order_id)
5. Fechar mesa: pagamento → ambas ficam Available → grupo dissolvido
6. Tentar juntar mesa Occupied: deve falhar com erro
