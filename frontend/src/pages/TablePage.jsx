import { useEffect, useMemo, useState } from "react";
import { useTheme } from "@/context/ThemeContext";
import { tableService } from "@/services";
import { STATUS_CONFIG } from "@/utils/tablePageUtils";
import { PageSection, StatCard, TableCard } from "@/components";

const formatTableLabel = (number) => `T${String(number).padStart(2, "0")}`;

export default function TablePage() {
  const [mesas, setMesas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedTableId, setSelectedTableId] = useState(null);
  const [tableDetails, setTableDetails] = useState(null);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [detailsError, setDetailsError] = useState(null);

  useEffect(() => {
    const fetchMesas = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await tableService.getAll();
        setMesas(data);
      } catch (err) {
        setError(err.message || "Não foi possível carregar as mesas.");
      } finally {
        setLoading(false);
      }
    };

    fetchMesas();
  }, []);

  useEffect(() => {
    if (!selectedTableId) {
      setTableDetails(null);
      setDetailsError(null);
      return;
    }

    const fetchTableDetails = async () => {
      setDetailsLoading(true);
      setDetailsError(null);

      try {
        const details = await tableService.getDetailsById(selectedTableId);
        setTableDetails(details);
      } catch (err) {
        setTableDetails(null);
        setDetailsError(
          err.message || "Não foi possível carregar os detalhes da mesa.",
        );
      } finally {
        setDetailsLoading(false);
      }
    };

    fetchTableDetails();
  }, [selectedTableId]);

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

  const activeOrder = tableDetails?.activeOrder ?? null;
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
          className="bg-surface"
        />
        <StatCard
          label="Ocupadas"
          value={totals.ocupada}
          icon="fa-solid fa-chair"
          className="bg-surface"
        />
        <StatCard
          label="Livres"
          value={totals.livre}
          icon="fa-solid fa-check-circle"
          className="bg-surface"
        />
        <StatCard
          label="Reservadas"
          value={totals.reservada}
          icon="fa-solid fa-calendar-check"
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

              <div className="mt-6 grid gap-4 sm:grid-cols-2">
                <div className="rounded-3xl bg-surface-2 p-4">
                  <p className="text-xs uppercase tracking-[0.24em] text-[var(--text-secondary)]">
                    Cliente em fila
                  </p>
                  <p className="mt-2 text-base font-semibold text-[var(--text)]">
                    {detailsLoading
                      ? "A carregar..."
                      : (activeOrder?.customer_name ?? "Sem cliente")}
                  </p>
                </div>
                <div className="rounded-3xl bg-surface-2 p-4">
                  <p className="text-xs uppercase tracking-[0.24em] text-[var(--text-secondary)]">
                    Pedidos ativos
                  </p>
                  <p className="mt-2 text-base font-semibold text-[var(--text)]">
                    {detailsLoading
                      ? "A carregar..."
                      : (activeOrder?.order_ref ?? "--")}
                  </p>
                </div>
                <div className="rounded-3xl bg-surface-2 p-4">
                  <p className="text-xs uppercase tracking-[0.24em] text-[var(--text-secondary)]">
                    Items
                  </p>
                  <p className="mt-2 text-base font-semibold text-[var(--text)]">
                    {detailsLoading
                      ? "A carregar..."
                      : (activeOrder?.items ?? 0)}
                  </p>
                </div>
                <div className="rounded-3xl bg-surface-2 p-4">
                  <p className="text-xs uppercase tracking-[0.24em] text-[var(--text-secondary)]">
                    Valor atual
                  </p>
                  <p className="mt-2 text-2xl font-bold text-[var(--text)]">
                    {detailsLoading
                      ? "A carregar..."
                      : formattedTotalValue(activeOrder?.total_amount)}
                  </p>
                </div>
              </div>

              <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                <button
                  className={`flex-1 rounded-full px-4 py-3 text-sm font-semibold text-white transition ${
                    activeOrder
                      ? "bg-[var(--primary)] hover:bg-[var(--primary-hover)]"
                      : "bg-[var(--surface-2)] text-[var(--text-secondary)] cursor-not-allowed"
                  }`}
                  type="button"
                  disabled={!activeOrder}
                >
                  Ver pedido
                </button>
                <button
                  className={`flex-1 rounded-full border border-[var(--border)] px-4 py-3 text-sm font-semibold transition ${
                    activeOrder
                      ? "bg-[var(--surface)] text-[var(--text)] hover:bg-[var(--surface-2)]"
                      : "bg-[var(--surface-2)] text-[var(--text-secondary)] cursor-not-allowed"
                  }`}
                  type="button"
                  disabled={!activeOrder}
                >
                  Fechar conta
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </PageSection>
  );
}
