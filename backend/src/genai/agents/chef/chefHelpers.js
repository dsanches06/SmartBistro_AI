// Extrai itens indisponíveis, estado de stock e alertas da resposta do Chef.
function deriveChefStockMetrics(sequenced) {
  const unavailableItems = Array.isArray(sequenced.items)
    ? sequenced.items.filter((item) => item?.unavailable === true)
    : [];

  const stockStatus = String(
    sequenced.stock_status ?? sequenced.stockStatus ?? "ok",
  ).toLowerCase();
  const stockAlerts = Array.isArray(sequenced.stock_alerts)
    ? sequenced.stock_alerts
    : Array.isArray(sequenced.stockAlerts)
      ? sequenced.stockAlerts
      : [];

  return { unavailableItems, stockStatus, stockAlerts };
}

export { deriveChefStockMetrics };