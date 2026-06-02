function buildManagerMessage(validated, sequenced, financials) {
  const stockWarnings = [];
  if (sequenced.stock_status !== "ok") {
    stockWarnings.push(`Stock status: ${sequenced.stock_status}`);
  }
  if (Array.isArray(sequenced.stock_alerts) && sequenced.stock_alerts.length) {
    stockWarnings.push(
      `Stock alerts:\n${sequenced.stock_alerts
        .map((alert) => `  - ${alert.ingredient}: ${alert.available}`)
        .join("\n")}`,
    );
  }

  const unavailableItems = Array.isArray(sequenced.items)
    ? sequenced.items.filter((item) => item?.unavailable === true)
    : [];

  return `
Recebeste do Chefe a sequência de preparação. Os totais financeiros já estão calculados em JS — NÃO RECALCULES.
Devolve APENAS JSON (sem texto, sem markdown).

AVISOS DE STOCK:
${stockWarnings.length ? stockWarnings.join("\n") : "Nenhum aviso de stock."}
${
    unavailableItems.length
      ? `\nITENS INDISPONÍVEIS:\n${unavailableItems
          .map(
            (item) =>
              `  - ${item.name} (id ${item.item_id}): ${item.reason ?? "sem motivo fornecido"}`,
          )
          .join("\n")}`
      : ""
  }

INSTRUÇÕES IMPORTANTES:
- Se stock_status for "partial", considera isso um aviso de stock, não uma falha automática.
- Se houver itens indisponíveis, apenas relata-os; não alteres os totais ou recalcules a fatura.
- O pedido final deve refletir os itens válidos que o Chef confirmou como preparados.

TAREFA:
1. Confirma a fatura com os totais calculados abaixo
2. Define o estado inicial do pagamento como "Pending"
3. Gera o objeto final do pedido completamente estruturado

TOTAIS JÁ CALCULADOS (não alterar):
  subtotal : €${financials.subtotal}
  IVA (${(financials.taxRate * 100).toFixed(0)}%)  : €${financials.taxAmount}
  total    : €${financials.total}

RESPONDE EXACTAMENTE com este JSON:
{
  "success": true,
  "order_summary": "<resumo do pedido>",
  "invoice": {
    "subtotal_amount": ${financials.subtotal},
    "tax_rate": ${financials.taxRate},
    "tax_amount": ${financials.taxAmount},
    "total_amount": ${financials.total}
  },
  "payment": {
    "method": "Pending",
    "status": "Pending"
  },
  "notes": "<observações do Gerente>"
}

DADOS DO PEDIDO VALIDADOS (Maître):
${JSON.stringify(validated, null, 2)}

DADOS DA SEQUÊNCIA (Chefe):
${JSON.stringify(sequenced, null, 2)}
`.trim();
}

export { buildManagerMessage };