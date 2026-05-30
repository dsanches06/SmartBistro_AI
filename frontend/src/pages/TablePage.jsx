import { useCallback, useEffect, useMemo, useState } from "react";
import { useTheme } from "@/context/ThemeContext";
import { reservationService, tableService, orderService } from "@/services";
import { STATUS_CONFIG } from "@/utils/tablePageUtils";
import { getItemEmoji, formatMenuPrice } from "@/utils";
import { PageSection, StatCard, TableCard } from "@/components";

const formatTableLabel = (number) => `T${String(number).padStart(2, "0")}`;

export default function TablePage() {
  const [mesas, setMesas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [tableOccupancy, setTableOccupancy] = useState({});
  const [selectedTableId, setSelectedTableId] = useState(null);
  const [tableDetails, setTableDetails] = useState(null);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [detailsError, setDetailsError] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);

  const fetchMesas = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      setMesas(await tableService.getAll());
    } catch (err) {
      setError(err.message || "Não foi possível carregar as mesas.");
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchTableDetails = useCallback(async (id) => {
    if (!id) { setTableDetails(null); setDetailsError(null); return; }
    setDetailsLoading(true);
    setDetailsError(null);
    try {
      setTableDetails(await tableService.getDetailsById(id));
    } catch (err) {
      setTableDetails(null);
      setDetailsError(err.message || "Não foi possível carregar os detalhes da mesa.");
    } finally {
      setDetailsLoading(false);
    }
  }, []);

  const fetchOccupancy = useCallback(async () => {
    try {
      const orders = await orderService.getAll();
      const map = {};
      for (const order of (Array.isArray(orders) ? orders : [])) {
        if (!order.table_id) continue;
        if (order.order_status === 'Cancelled') continue;
        // Itens só visíveis quando o pedido foi entregue na mesa
        if (order.order_status !== 'Delivered') continue;
        const items = (() => {
          try {
            return Array.isArray(order.kitchen_sequence_json)
              ? order.kitchen_sequence_json
              : JSON.parse(order.kitchen_sequence_json || '[]');
          } catch { return []; }
        })();
        const newEmojis = [...new Set(items.map(n => getItemEmoji(n)))];
        if (!map[order.table_id]) {
          map[order.table_id] = { emojis: newEmojis };
        } else {
          map[order.table_id].emojis = [...new Set([...map[order.table_id].emojis, ...newEmojis])];
        }
      }
      setTableOccupancy(map);
    } catch { /* silently ignore */ }
  }, []);

  useEffect(() => { fetchMesas(); fetchOccupancy(); }, [fetchMesas, fetchOccupancy]);
  useEffect(() => { fetchTableDetails(selectedTableId); }, [selectedTableId, fetchTableDetails]);

  // Actualiza mesas e detalhes quando o chatbot faz mutações (cancel/create reservation, update_table_status)
  useEffect(() => {
    const onRefresh = () => {
      fetchMesas();
      if (selectedTableId) fetchTableDetails(selectedTableId);
    };
    window.addEventListener('table:refresh', onRefresh);
    return () => window.removeEventListener('table:refresh', onRefresh);
  }, [fetchMesas, fetchTableDetails, selectedTableId]);

  // Re-fetch occupancy quando o KDS muda status de um pedido
  useEffect(() => {
    const onStatusChanged = () => fetchOccupancy();
    window.addEventListener('orders:statusChanged', onStatusChanged);
    return () => window.removeEventListener('orders:statusChanged', onStatusChanged);
  }, [fetchOccupancy]);

  // Auto-refresh de occupancy a cada 15 s (fallback quando TablePage está aberta sem KDS)
  useEffect(() => {
    const id = setInterval(fetchOccupancy, 15_000);
    return () => clearInterval(id);
  }, [fetchOccupancy]);

  const handleConfirmReservation = async () => {
    if (!activeReservation) return;
    setActionLoading(true);
    try {
      await reservationService.confirm(activeReservation.id);
      await fetchTableDetails(selectedTableId);
    } catch (err) {
      setDetailsError(err.message || "Erro ao confirmar reserva.");
    } finally {
      setActionLoading(false);
    }
  };

  const handleCancelReservation = async () => {
    if (!activeReservation) return;
    setActionLoading(true);
    try {
      await reservationService.cancel(activeReservation.id);
      await Promise.all([fetchMesas(), fetchTableDetails(selectedTableId)]);
    } catch (err) {
      setDetailsError(err.message || "Erro ao cancelar reserva.");
    } finally {
      setActionLoading(false);
    }
  };

  const selectedTable = useMemo(
    () => mesas.find((mesa) => mesa.id === selectedTableId),
    [mesas, selectedTableId],
  );

  const totals = useMemo(() => {
    return mesas.reduce(
      (acc, mesa) => {
        acc.total += 1;
        if (mesa.status === "Available") acc.livre += 1;
        if (mesa.status === "Occupied") acc.ocupada += 1;
        if (mesa.status === "Reserved") acc.reservada += 1;
        return acc;
      },
      { total: 0, livre: 0, ocupada: 0, reservada: 0 },
    );
  }, [mesas]);

  const { theme } = useTheme();
  const isDark = theme === "dark";

  const formattedTotalValue = (value) =>
    `€${Number(value ?? 0)
      .toFixed(2)
      .replace(".", ",")}`;

  const activeOrder       = tableDetails?.activeOrder       ?? null;
  const activeReservation = tableDetails?.activeReservation ?? null;
  const isReserved        = selectedTable?.status === "Reserved";

  const formatReservationDate = (dateStr) => {
    if (!dateStr) return "--";
    return new Date(dateStr).toLocaleString("pt-PT", {
      day: "2-digit", month: "2-digit", year: "numeric",
      hour: "2-digit", minute: "2-digit",
    });
  };

  const selectedStatusConfig = selectedTable
    ? STATUS_CONFIG[selectedTable.status]
    : null;

  return (
    <PageSection>
      <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-[var(--text)]">Mesas</h1>
        </div>
      </div>

      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 md:grid-cols-4">
        <StatCard
          label="Total Mesas"
          value={totals.total}
          icon="fa-solid fa-table-cells"
          borderColor="#3b82f6"
          className="bg-surface"
        />
        <StatCard
          label="Ocupadas"
          value={totals.ocupada}
          icon="fa-solid fa-chair"
          borderColor="#f59e0b"
          className="bg-surface"
        />
        <StatCard
          label="Livres"
          value={totals.livre}
          icon="fa-solid fa-check-circle"
          borderColor="#22c55e"
          className="bg-surface"
        />
        <StatCard
          label="Reservadas"
          value={totals.reservada}
          icon="fa-solid fa-calendar-check"
          borderColor="#8b5cf6"
          className="bg-surface"
        />
      </div>

      {loading && (
        <div className="rounded-[32px] border border-dashed border-surface bg-surface p-10 text-center text-[var(--text-secondary)] shadow-sm">
          A carregar mesas...
        </div>
      )}

      {error && (
        <div className="rounded-[32px] border border-red-200 bg-red-50 p-6 text-sm text-red-700 shadow-sm">
          {error}
        </div>
      )}

      {!loading && !error && (
        <div
          className={`grid gap-6 ${selectedTableId ? "xl:grid-cols-[1.55fr_0.95fr]" : "xl:grid-cols-1"}`}
        >
          <div className="rounded-[32px] bg-surface p-6 shadow-sm">
            <div className="grid gap-4 grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-6 xl:grid-rows-4 justify-items-center">
              {mesas.length === 0 ? (
                <div className="col-span-full text-center py-16 text-[var(--text-secondary)]">
                  Nenhuma mesa encontrada.
                </div>
              ) : (
                mesas.map((mesa) => (
                  <TableCard
                    key={mesa.id}
                    mesa={mesa}
                    isSelected={mesa.id === selectedTableId}
                    occupancy={tableOccupancy[mesa.id]}
                    onSelect={() =>
                      setSelectedTableId((previous) =>
                        previous === mesa.id ? null : mesa.id,
                      )
                    }
                  />
                ))
              )}
            </div>
          </div>

          {selectedTableId && (
            <div className="rounded-[32px] bg-surface p-6 shadow-sm">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <p className="text-sm uppercase tracking-[0.24em] text-[var(--text-secondary)]">
                    Detalhes da Mesa
                  </p>
                  <h2 className="mt-3 text-2xl font-semibold text-[var(--text)]">
                    {selectedTable
                      ? formatTableLabel(selectedTable.table_number)
                      : "--"}
                  </h2>
                </div>
                <span
                  className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] ${selectedStatusConfig?.mesa ?? "bg-[var(--surface-2)] text-[var(--primary)]"}`}
                >
                  {selectedTable ? selectedStatusConfig?.label : "--"}
                </span>
              </div>

              {detailsError && (
                <div className="rounded-[24px] border border-red-200 bg-red-50 p-4 text-sm text-red-700 shadow-sm">
                  {detailsError}
                </div>
              )}

              {isReserved ? (
                <>
                  {!detailsLoading && activeReservation?.id && (
                    <div className="mt-6 rounded-3xl bg-[var(--primary)] px-5 py-3 flex items-center justify-between">
                      <p className="text-xs uppercase tracking-[0.24em] text-white/70 font-medium">
                        Nº de reserva
                      </p>
                      <p className="text-lg font-bold text-white">
                        #{activeReservation.id}
                      </p>
                    </div>
                  )}

                  <div className="mt-4 grid gap-4 sm:grid-cols-2">
                    <div className="rounded-3xl bg-surface-2 p-4">
                      <p className="text-xs uppercase tracking-[0.24em] text-[var(--text-secondary)]">
                        Cliente
                      </p>
                      <p className="mt-2 text-base font-semibold text-[var(--text)]">
                        {detailsLoading ? "A carregar..." : (activeReservation?.customer_name ?? "Sem cliente")}
                      </p>
                    </div>
                    <div className="rounded-3xl bg-surface-2 p-4">
                      <p className="text-xs uppercase tracking-[0.24em] text-[var(--text-secondary)]">
                        Data da reserva
                      </p>
                      <p className="mt-2 text-base font-semibold text-[var(--text)]">
                        {detailsLoading ? "A carregar..." : formatReservationDate(activeReservation?.reservation_date)}
                      </p>
                    </div>
                    <div className="rounded-3xl bg-surface-2 p-4">
                      <p className="text-xs uppercase tracking-[0.24em] text-[var(--text-secondary)]">
                        Nº de pessoas
                      </p>
                      <p className="mt-2 text-base font-semibold text-[var(--text)]">
                        {detailsLoading ? "A carregar..." : (activeReservation?.party_size ?? "--")}
                      </p>
                    </div>
                    <div className="rounded-3xl bg-surface-2 p-4">
                      <p className="text-xs uppercase tracking-[0.24em] text-[var(--text-secondary)]">
                        Contacto
                      </p>
                      <p className="mt-2 text-base font-semibold text-[var(--text)]">
                        {detailsLoading ? "A carregar..." : (activeReservation?.phone ?? "--")}
                      </p>
                    </div>
                  </div>

                  {!detailsLoading && activeReservation?.notes && (
                    <div className="mt-4 rounded-3xl bg-surface-2 p-4">
                      <p className="text-xs uppercase tracking-[0.24em] text-[var(--text-secondary)]">
                        Notas
                      </p>
                      <p className="mt-2 text-sm text-[var(--text)]">
                        {activeReservation.notes}
                      </p>
                    </div>
                  )}

                  <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                    <button
                      className={`flex-1 rounded-full px-4 py-3 text-sm font-semibold text-white transition ${
                        activeReservation && !actionLoading
                          ? "bg-[var(--primary)] hover:bg-[var(--primary-hover)]"
                          : "bg-[var(--surface-2)] text-[var(--text-secondary)] cursor-not-allowed"
                      }`}
                      type="button"
                      disabled={!activeReservation || actionLoading}
                      onClick={handleConfirmReservation}
                    >
                      {actionLoading ? "A processar..." : "Confirmar reserva"}
                    </button>
                    <button
                      className={`flex-1 rounded-full border border-[var(--border)] px-4 py-3 text-sm font-semibold transition ${
                        activeReservation && !actionLoading
                          ? "bg-[var(--surface)] text-[var(--text)] hover:bg-[var(--surface-2)]"
                          : "bg-[var(--surface-2)] text-[var(--text-secondary)] cursor-not-allowed"
                      }`}
                      type="button"
                      disabled={!activeReservation || actionLoading}
                      onClick={handleCancelReservation}
                    >
                      {actionLoading ? "A processar..." : "Cancelar reserva"}
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <div className="mt-6 grid gap-4 sm:grid-cols-2">
                    <div className="rounded-3xl bg-surface-2 p-4">
                      <p className="text-xs uppercase tracking-[0.24em] text-[var(--text-secondary)]">
                        Cliente em fila
                      </p>
                      <p className="mt-2 text-base font-semibold text-[var(--text)]">
                        {detailsLoading ? "A carregar..." : (activeOrder?.customer_name ?? "Sem cliente")}
                      </p>
                    </div>
                    <div className="rounded-3xl bg-surface-2 p-4">
                      <p className="text-xs uppercase tracking-[0.24em] text-[var(--text-secondary)]">
                        Pedidos ativos
                      </p>
                      <p className="mt-2 text-base font-semibold text-[var(--text)]">
                        {detailsLoading ? "A carregar..." : (activeOrder?.order_ref ?? "--")}
                      </p>
                    </div>
                    <div className="rounded-3xl bg-surface-2 p-4">
                      <p className="text-xs uppercase tracking-[0.24em] text-[var(--text-secondary)]">
                        Items
                      </p>
                      <p className="mt-2 text-base font-semibold text-[var(--text)]">
                        {detailsLoading ? "A carregar..." : (activeOrder?.items ?? 0)}
                      </p>
                    </div>
                    <div className="rounded-3xl bg-surface-2 p-4">
                      <p className="text-xs uppercase tracking-[0.24em] text-[var(--text-secondary)]">
                        Valor atual
                      </p>
                      <p className="mt-2 text-2xl font-bold text-[var(--text)]">
                        {detailsLoading ? "A carregar..." : formattedTotalValue(activeOrder?.total_amount)}
                      </p>
                    </div>
                  </div>

                  {/* Card de itens pedidos */}
                  {activeOrder && (() => {
                    const items = (() => {
                      try {
                        const raw = activeOrder.kitchen_sequence_json;
                        return Array.isArray(raw) ? raw : JSON.parse(raw || '[]');
                      } catch { return []; }
                    })();
                    if (!items.length) return null;
                    return (
                      <div className="mt-4 rounded-3xl bg-surface-2 p-4">
                        <p className="text-xs uppercase tracking-[0.24em] text-[var(--text-secondary)] mb-3">
                          Itens Pedidos
                        </p>
                        <div className="flex flex-col gap-2">
                          {items.map((name, i) => (
                            <div key={i} className="flex items-center gap-2.5 rounded-xl px-3 py-2"
                              style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
                              <span style={{ fontSize: 18 }}>{getItemEmoji(name)}</span>
                              <span className="text-sm font-semibold flex-1" style={{ color: "var(--text)" }}>{name}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })()}

                </>
              )}
            </div>
          )}
        </div>
      )}
    </PageSection>
  );
}
