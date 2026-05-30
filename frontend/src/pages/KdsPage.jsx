import { useEffect, useMemo, useState } from "react";
import { PageSection } from "@/components";
import { itemService, orderItemService, orderService } from "@/services";
import {
  KDS_CATEGORIES,
  KDS_STATUS_COLUMNS,
  normalizeCategory,
  mapDisplayStatus,
  formatTime,
} from "@/utils";

export default function KdsPage() {
  const [orders, setOrders] = useState([]);
  const [orderItems, setOrderItems] = useState([]);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState("all");

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      setError(null);

      try {
        const [ordersResponse, orderItemsResponse, itemsResponse] =
          await Promise.all([
            orderService.getAll(),
            orderItemService.getAll(),
            itemService.getAll(),
          ]);

        setOrders(
          Array.isArray(ordersResponse.data) ? ordersResponse.data : [],
        );
        setOrderItems(
          Array.isArray(orderItemsResponse.data) ? orderItemsResponse.data : [],
        );
        setItems(Array.isArray(itemsResponse.data) ? itemsResponse.data : []);
      } catch (err) {
        console.error(err);
        setError("Não foi possível carregar os pedidos. Tente novamente.");
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, []);

  const itemsMap = useMemo(
    () =>
      items.reduce((acc, item) => {
        acc[item.id] = item;
        return acc;
      }, {}),
    [items],
  );

  const ordersWithDetails = useMemo(() => {
    const orderItemsByOrder = orderItems.reduce((acc, item) => {
      if (!acc[item.order_id]) acc[item.order_id] = [];
      acc[item.order_id].push(item);
      return acc;
    }, {});

    return orders
      .filter(
        (order) => order.order_status && order.order_status !== "Cancelled",
      )
      .map((order) => {
        const orderItemLines = (orderItemsByOrder[order.id] || []).map(
          (orderItem) => {
            const item = itemsMap[orderItem.item_id];
            return {
              ...orderItem,
              item_name: item?.name || `Item ${orderItem.item_id}`,
              category: normalizeCategory(item?.category),
            };
          },
        );

        const kitchenItems = Array.isArray(order.kitchen_sequence_json)
          ? order.kitchen_sequence_json
          : typeof order.kitchen_sequence_json === "string"
            ? (() => {
                try {
                  return JSON.parse(order.kitchen_sequence_json);
                } catch {
                  return [];
                }
              })()
            : [];

        return {
          ...order,
          kitchenItems,
          orderItemLines,
          categories: [...new Set(orderItemLines.map((line) => line.category))],
          displayStatus: mapDisplayStatus(order.order_status),
        };
      });
  }, [orders, orderItems, itemsMap]);

  const categoryCounts = useMemo(() => {
    const summary = KDS_CATEGORIES.reduce((acc, category) => {
      acc[category.id] = category.id === "all" ? ordersWithDetails.length : 0;
      return acc;
    }, {});

    ordersWithDetails.forEach((order) => {
      order.categories.forEach((category) => {
        if (summary[category] !== undefined) summary[category] += 1;
      });
    });

    return summary;
  }, [ordersWithDetails]);

  const filteredOrders = useMemo(() => {
    if (selectedCategory === "all") return ordersWithDetails;
    return ordersWithDetails.filter((order) =>
      order.categories.includes(selectedCategory),
    );
  }, [ordersWithDetails, selectedCategory]);

  const groupedOrders = useMemo(
    () =>
      KDS_STATUS_COLUMNS.reduce((acc, column) => {
        acc[column.status] = filteredOrders.filter(
          (order) => order.displayStatus === column.status,
        );
        return acc;
      }, {}),
    [filteredOrders],
  );

  const renderOrderCard = (order) => {
    const target = order.table_id ? `Mesa ${order.table_id}` : "Takeaway";
    const itemsToShow =
      order.orderItemLines.length > 0
        ? order.orderItemLines
        : order.kitchenItems.map((name, index) => ({
            item_name: name,
            category: "Unknown",
          }));

    return (
      <div
        key={order.id}
        className="rounded-[24px] border border-surface bg-surface-2 p-4 shadow-sm"
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-sm text-[var(--text-secondary)]">
              #{order.id} · {target}
            </p>
            <p className="mt-1 text-lg font-semibold text-[var(--text)]">
              {order.customer_id
                ? `Cliente ${order.customer_id}`
                : "Cliente desconhecido"}
            </p>
          </div>
          <span className="rounded-full bg-surface px-3 py-1 text-xs text-[var(--text-secondary)]">
            {formatTime(order.created_at)}
          </span>
        </div>

        <div className="mt-4 space-y-2">
          {itemsToShow.slice(0, 4).map((line, index) => (
            <div
              key={`${order.id}-${index}`}
              className="flex items-center justify-between gap-3 rounded-2xl bg-surface p-3 text-sm"
            >
              <span>
                {line.quantity ? `${line.quantity}x ` : ""}
                {line.item_name}
              </span>
              {line.category && line.category !== "Unknown" && (
                <span className="rounded-full bg-[var(--surface)] px-2 py-0.5 text-[var(--text-secondary)]">
                  {line.category}
                </span>
              )}
            </div>
          ))}
          {itemsToShow.length > 4 && (
            <p className="text-xs text-[var(--text-secondary)]">
              +{itemsToShow.length - 4} item(s) adicionais
            </p>
          )}
        </div>

        <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
          <span className="rounded-full bg-surface px-3 py-1 text-xs font-semibold text-[var(--text-secondary)]">
            {order.order_status}
          </span>
          <span className="text-xs text-[var(--text-secondary)]">
            {order.service_type}
          </span>
        </div>
      </div>
    );
  };

  return (
    <PageSection
      title="KDS"
      description="Visão da cozinha e pedidos em produção"
    >
      <div className="rounded-[32px] bg-surface p-6 shadow-sm">
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-xl font-semibold">KDS — Cozinha</h1>
            <p className="mt-1 text-sm text-[var(--text-secondary)]">
              Pedidos e estado atual carregados direto da base de dados.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {KDS_CATEGORIES.map((category) => (
              <button
                key={category.id}
                type="button"
                onClick={() => setSelectedCategory(category.id)}
                className={`rounded-full border px-4 py-2 text-sm font-semibold transition ${
                  selectedCategory === category.id
                    ? "border-[var(--primary)] bg-[var(--primary)] text-white"
                    : "border-surface bg-surface-2 text-[var(--text-secondary)] hover:bg-surface"
                }`}
              >
                {category.label} ({categoryCounts[category.id] ?? 0})
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="rounded-3xl bg-surface-2 p-6 text-center text-[var(--text-secondary)]">
            A carregar pedidos...
          </div>
        ) : error ? (
          <div className="rounded-3xl bg-red-50 p-6 text-center text-red-700">
            {error}
          </div>
        ) : (
          <div className="grid gap-4 xl:grid-cols-4">
            {KDS_STATUS_COLUMNS.slice(0, 4).map((column) => (
              <div key={column.status} className="space-y-4">
                <div className={`rounded-3xl border p-4 ${column.accent}`}>
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <p className="text-sm font-semibold uppercase tracking-[0.2em]">
                        {column.title}
                      </p>
                      <p className="mt-2 text-4xl font-bold">
                        {groupedOrders[column.status]?.length ?? 0}
                      </p>
                    </div>
                    <div className="flex h-12 w-12 items-center justify-center rounded-3xl bg-white/90 text-lg font-bold text-[var(--text)]">
                      {groupedOrders[column.status]?.length ?? 0}
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  {(groupedOrders[column.status] || []).map(renderOrderCard)}
                  {(groupedOrders[column.status] || []).length === 0 && (
                    <div className="rounded-3xl border border-dashed border-surface bg-surface-2 p-6 text-center text-[var(--text-secondary)]">
                      Sem pedidos neste estado.
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </PageSection>
  );
}
