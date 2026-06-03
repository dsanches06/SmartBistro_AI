function buildChefMessage(validated, menuItems) {
  const menuInfo = menuItems
    .map(
      (i) =>
        `  - id ${i.id}, ${i.name}, ${i.category ?? "—"}, €${Number(i.price).toFixed(2)}`,
    )
    .join("\n");

  return `
Recebeste do Maître a fila de pedidos validada. Devolve APENAS JSON (sem texto, sem markdown).

MENU ACTIVO:
${menuInfo}

TAREFA:
1. Define a sequência de preparação óptima por secção da cozinha (grelhados, massas, entradas, etc.)
2. Verifica o stock de ingredientes para cada prato
3. Estima o tempo de preparação EM SEGUNDOS (modo simulação: usa valores entre 20 e 90 segundos)
4. Se algum ingrediente estiver em falta, indica na lista stock_alerts
5. Usa stock_status "ok" quando tudo estiver disponível e "partial" se algum ingrediente estiver em falta

ATENÇÃO: estimated_seconds é SEMPRE em segundos (ex: prato simples=20, prato complexo=60, múltiplos pratos=90).
NÃO uses minutos. NÃO uses valores acima de 120.

RESPONDE EXACTAMENTE com este JSON (ATENÇÃO: "sections" usa CHAVES {}, não parênteses rectos []):
{
  "kitchen_sequence": ["<prato 1>", "<prato 2>"],
  "sections": { "<secção>": ["<prato 1>", "<prato 2>"] },
  "stock_status": "ok" ou "partial",
  "stock_alerts": [],
  "estimated_seconds": <número entre 20 e 120>,
  "items": [
    { "item_id": <número>, "name": "<nome>", "quantity": <número>, "price": <preço>, "unavailable": <true|false>, "reason": "<motivo>" }
  ],
  "notes": "<observações do Chefe>"
}

FILA DE PEDIDOS DO MAÎTRE:
${JSON.stringify(validated, null, 2)}
`.trim();
}

export { buildChefMessage };