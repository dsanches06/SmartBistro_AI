function buildMaitreMessage(orderData, availableTables, menuItems) {
  const tablesInfo = availableTables.length
    ? availableTables
        .map(
          (t) =>
            `  - id ${t.id}, ${t.table_number}, capacidade ${t.capacity}, ${t.status}`,
        )
        .join("\n")
    : "  (nenhuma mesa disponível de momento)";

  const menuInfo = menuItems
    .map(
      (i) =>
        `  - id ${i.id}, ${i.name}, ${i.category ?? "—"}, €${Number(i.price).toFixed(2)}`,
    )
    .join("\n");

  return `
Analisa a mensagem do cliente e devolve APENAS JSON (sem texto adicional, sem markdown).

MENSAGEM DO CLIENTE:
"${orderData.message}"

CLIENTE: ${[orderData.customer_name, orderData.customer_surname].filter(Boolean).join(" ")}

MESAS DISPONÍVEIS (status Available):
${tablesInfo}

MENU ACTIVO:
${menuInfo}

TAREFA:
1. Detecta o tipo de serviço: "Table" (jantar/almoço/comer aqui/mesa) ou "Takeaway" (levar/para fora/takeaway)
2. Se "Table": escolhe UMA mesa disponível adequada ao número de pessoas mencionado (mínimo 1)
3. Se "Takeaway": table_id deve ser null
4. Identifica os pratos pedidos fazendo corresponder ao menu activo por semelhança fonética/textual
5. Estima a quantidade de cada prato (1 por padrão, salvo indicação contrária)
6. Usa os preços exactos do menu activo fornecido acima
7. Regista restrições alimentares ou alergias mencionadas (null se nenhuma)

RESPONDE EXACTAMENTE com este JSON (sem comentários, sem markdown):
{
  "customer_name": "<nome do cliente>",
  "customer_surname": "<apelido ou null>",
  "table_id": <número ou null se Takeaway>,
  "service_type": "Table" ou "Takeaway",
  "allergy_restrictions": <"string" ou null>,
  "validation_status": "valid",
  "items": [
    { "item_id": <número>, "name": "<nome exacto do menu>", "quantity": <número>, "price": <preço decimal> }
  ],
  "notes": "<observações do Maître — ex: mesa T03 atribuída para 2 pessoas>"
}
`.trim();
}

function buildMaitreStockFeedbackMessage(
  validated,
  availableTables,
  menuItems,
  sequenced,
) {
  const unavailableItems = Array.isArray(sequenced.items)
    ? sequenced.items.filter((item) => item?.unavailable === true)
    : [];

  const tablesInfo = availableTables.length
    ? availableTables
        .map(
          (t) =>
            `  - id ${t.id}, ${t.table_number}, capacidade ${t.capacity}, ${t.status}`,
        )
        .join("\n")
    : "  (nenhuma mesa disponível de momento)";

  const menuInfo = menuItems
    .map(
      (i) =>
        `  - id ${i.id}, ${i.name}, ${i.category ?? "—"}, €${Number(i.price).toFixed(2)}`,
    )
    .join("\n");

  return `
O Chefe reportou problemas de stock e itens indisponíveis. Reavalia o pedido para manter apenas pratos disponíveis ou proponha substituições.

PEDIDO ACTUAL DO MAÎTRE:
${JSON.stringify(validated, null, 2)}

ITEMS INDISPONÍVEIS:
${unavailableItems.length ? unavailableItems.map((item) => `  - ${item.name} (id ${item.item_id}): ${item.reason ?? "sem motivo fornecido"}`).join("\n") : "  (nenhum)"}

MESAS DISPONÍVEIS (status Available):
${tablesInfo}

MENU ACTIVO:
${menuInfo}

RESPONDE NOVAMENTE APENAS com o mesmo JSON de Maître, ajustando o pedido se necessário.
`.trim();
}

export { buildMaitreMessage, buildMaitreStockFeedbackMessage };