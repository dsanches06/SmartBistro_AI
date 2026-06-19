import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTheme } from "@/context/ThemeContext";
import { useTableRefresh } from "@/context/TableRefreshContext";
import { reservationService, tableService, orderService, customerService, invoiceService } from "@/services";
import { STATUS_CONFIG } from "@/utils/tablePageUtils";
import { getItemEmoji, formatMenuPrice } from "@/utils";
import { PageSection, StatCard, TableCard, PaymentModal } from "@/components";

const formatTableLabel = (number) => `T${String(number).padStart(2, "0")}`;

/* ── NovaMesaModal ── */
function NovaMesaModal({ onClose, onCreate }) {
  const [form, setForm] = useState({ table_number: "", capacity: "4" });
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.table_number.trim()) return setErr("Número da mesa obrigatório.");
    const capacity = parseInt(form.capacity);
    if (isNaN(capacity) || capacity < 1) return setErr("Capacidade inválida.");
    setSaving(true); setErr("");
    try {
      const created = await tableService.create({ table_number: form.table_number.trim(), capacity, status: "Available" });
      onCreate(created);
      onClose();
    } catch { setErr("Erro ao criar mesa. Verifique se o número já existe."); }
    finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.5)" }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="rounded-[24px] p-6 w-full max-w-sm shadow-2xl"
        style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-bold" style={{ color: "var(--text)" }}>Nova Mesa</h2>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-xl"
            style={{ background: "var(--surface-2)", color: "var(--text-muted)" }}>
            <i className="fa-solid fa-xmark text-sm" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <label className="block text-xs font-semibold mb-1" style={{ color: "var(--text-secondary)" }}>Número da Mesa *</label>
            <input type="text" value={form.table_number} onChange={e => set("table_number", e.target.value)}
              placeholder="Ex: T25"
              className="w-full rounded-xl px-3 py-2 text-sm outline-none"
              style={{ background: "var(--surface-2)", border: "1px solid var(--border)", color: "var(--text)" }} />
          </div>
          <div>
            <label className="block text-xs font-semibold mb-1" style={{ color: "var(--text-secondary)" }}>Capacidade (lugares)</label>
            <input type="number" min="1" max="20" value={form.capacity} onChange={e => set("capacity", e.target.value)}
              className="w-full rounded-xl px-3 py-2 text-sm outline-none"
              style={{ background: "var(--surface-2)", border: "1px solid var(--border)", color: "var(--text)" }} />
          </div>
          {err && <p className="text-xs text-red-500">{err}</p>}
          <div className="flex gap-2 pt-1">
            <button type="button" onClick={onClose}
              className="flex-1 py-2 rounded-xl text-sm font-semibold"
              style={{ background: "var(--surface-2)", color: "var(--text-secondary)" }}>
              Cancelar
            </button>
            <button type="submit" disabled={saving}
              className="flex-1 py-2 rounded-xl text-sm font-semibold text-white disabled:opacity-60"
              style={{ background: "var(--primary)" }}>
              {saving ? <i className="fa-solid fa-spinner fa-spin" /> : "Criar Mesa"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* ── AtribuirMesaModal ── */
function AtribuirMesaModal({ table, onClose, onAssigned }) {
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [assigning, setAssigning] = useState(null);
  const [err, setErr] = useState("");

  useEffect(() => {
    (async () => {
      try {
        const [allCustomers, allOrders] = await Promise.all([
          customerService.getAll(),
          orderService.getAll(),
        ]);
        const seatedIds = new Set(
          (Array.isArray(allOrders) ? allOrders : [])
            .filter(o => o.table_id && !["Cancelled", "Delivered", "Done"].includes(o.order_status))
            .map(o => o.customer_id)
            .filter(Boolean),
        );
        setCustomers(
          (Array.isArray(allCustomers) ? allCustomers : []).filter(c => c.active && !seatedIds.has(c.id)),
        );
      } catch {
        setErr("Erro ao carregar clientes.");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const filtered = customers.filter(c =>
    c.name?.toLowerCase().includes(search.toLowerCase()) || c.phone?.includes(search),
  );

  const handleAssign = async (customer) => {
    setAssigning(customer.id); setErr("");
    try {
      await orderService.create({
        customer_id: customer.id,
        table_id: table.id,
        service_type: "Table",
        order_status: "Pending",
        kitchen_sequence_json: [],
        allergy_restrictions: "",
      });
      await tableService.updateStatus(table.id, "Occupied");
      onAssigned();
      onClose();
    } catch {
      setErr("Erro ao atribuir mesa. Tente novamente.");
    } finally {
      setAssigning(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.5)" }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="rounded-[24px] p-6 w-full max-w-sm shadow-2xl flex flex-col gap-4"
        style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold" style={{ color: "var(--text)" }}>Atribuir Mesa</h2>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-xl"
            style={{ background: "var(--surface-2)", color: "var(--text-muted)" }}>
            <i className="fa-solid fa-xmark text-sm" />
          </button>
        </div>
        <input
          autoFocus
          type="text"
          placeholder="Pesquisar cliente…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full rounded-xl px-3 py-2 text-sm outline-none"
          style={{ background: "var(--surface-2)", border: "1px solid var(--border)", color: "var(--text)" }}
        />
        {loading ? (
          <p className="text-center text-sm py-4" style={{ color: "var(--text-muted)" }}>
            <i className="fa-solid fa-spinner fa-spin mr-2" />A carregar...
          </p>
        ) : err ? (
          <p className="text-xs text-red-500">{err}</p>
        ) : filtered.length === 0 ? (
          <p className="text-center text-sm py-4" style={{ color: "var(--text-muted)" }}>Nenhum cliente disponível.</p>
        ) : (
          <div className="flex flex-col gap-2 overflow-y-auto max-h-64">
            {filtered.map(c => (
              <button key={c.id} onClick={() => handleAssign(c)} disabled={!!assigning}
                className="flex items-center justify-between w-full rounded-xl px-3 py-2.5 text-left transition-colors disabled:opacity-60"
                style={{ background: "var(--surface-2)", border: "1px solid var(--border)" }}>
                <div>
                  <p className="text-sm font-semibold" style={{ color: "var(--text)" }}>{c.name}</p>
                  {c.phone && <p className="text-xs" style={{ color: "var(--text-muted)" }}>{c.phone}</p>}
                </div>
                {assigning === c.id
                  ? <i className="fa-solid fa-spinner fa-spin text-xs" style={{ color: "var(--primary)" }} />
                  : <i className="fa-solid fa-arrow-right text-xs" style={{ color: "var(--primary)" }} />}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/* ── ReservarModal ── */
function ReservarModal({ table, onClose, onReserved }) {
  const [step, setStep] = useState(1);
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const todayStr = new Date().toISOString().split("T")[0];
  const [form, setForm] = useState({ date: "", time: "19:00", party_size: "2", phone: "" });
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  useEffect(() => {
    customerService.getAll()
      .then(data => setCustomers(Array.isArray(data) ? data.filter(c => c.active) : []))
      .catch(() => setErr("Erro ao carregar clientes."))
      .finally(() => setLoading(false));
  }, []);

  const filtered = customers.filter(c =>
    c.name?.toLowerCase().includes(search.toLowerCase()) || c.phone?.includes(search),
  );

  const handleSelectCustomer = (c) => {
    setSelectedCustomer(c);
    setForm(f => ({ ...f, phone: c.phone || "" }));
    setSearch(""); setErr("");
    setStep(2);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.date) return setErr("Data obrigatória.");
    if (!form.time) return setErr("Hora obrigatória.");
    setSaving(true); setErr("");
    try {
      await reservationService.create({
        customer_id: selectedCustomer.id,
        table_id: table.id,
        reservation_date: `${form.date}T${form.time}:00`,
        party_size: parseInt(form.party_size) || 2,
        phone: form.phone || selectedCustomer.phone || null,
        status: "Pending",
      });
      await tableService.updateStatus(table.id, "Reserved");
      onReserved();
      onClose();
    } catch {
      setErr("Erro ao criar reserva. Tente novamente.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.5)" }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="rounded-[24px] p-6 w-full max-w-sm shadow-2xl"
        style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>

        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            {step === 2 && (
              <button onClick={() => setStep(1)} className="w-7 h-7 flex items-center justify-center rounded-lg"
                style={{ background: "var(--surface-2)", color: "var(--text-muted)" }}>
                <i className="fa-solid fa-arrow-left text-xs" />
              </button>
            )}
            <h2 className="text-lg font-bold" style={{ color: "var(--text)" }}>
              {step === 1 ? "Reservar Mesa" : "Detalhes da Reserva"}
            </h2>
          </div>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-xl"
            style={{ background: "var(--surface-2)", color: "var(--text-muted)" }}>
            <i className="fa-solid fa-xmark text-sm" />
          </button>
        </div>

        {/* Step bar */}
        <div className="flex gap-2 mb-5">
          {[1, 2].map(s => (
            <div key={s} className="h-1 flex-1 rounded-full transition-colors"
              style={{ background: s <= step ? "var(--primary)" : "var(--border)" }} />
          ))}
        </div>

        {/* Step 1 — select customer */}
        {step === 1 && (
          <div className="flex flex-col gap-3">
            <input autoFocus type="text" placeholder="Pesquisar cliente…"
              value={search} onChange={e => setSearch(e.target.value)}
              className="w-full rounded-xl px-3 py-2 text-sm outline-none"
              style={{ background: "var(--surface-2)", border: "1px solid var(--border)", color: "var(--text)" }} />
            {loading ? (
              <p className="text-center text-sm py-4" style={{ color: "var(--text-muted)" }}>
                <i className="fa-solid fa-spinner fa-spin mr-2" />A carregar...
              </p>
            ) : filtered.length === 0 ? (
              <p className="text-center text-sm py-4" style={{ color: "var(--text-muted)" }}>Nenhum cliente encontrado.</p>
            ) : (
              <div className="flex flex-col gap-2 overflow-y-auto max-h-60">
                {filtered.map(c => (
                  <button key={c.id} onClick={() => handleSelectCustomer(c)}
                    className="flex items-center justify-between w-full rounded-xl px-3 py-2.5 text-left transition-colors"
                    style={{ background: "var(--surface-2)", border: "1px solid var(--border)" }}>
                    <div>
                      <p className="text-sm font-semibold" style={{ color: "var(--text)" }}>{c.name}</p>
                      {c.phone && <p className="text-xs" style={{ color: "var(--text-muted)" }}>{c.phone}</p>}
                    </div>
                    <i className="fa-solid fa-arrow-right text-xs" style={{ color: "var(--primary)" }} />
                  </button>
                ))}
              </div>
            )}
            {err && <p className="text-xs text-red-500">{err}</p>}
          </div>
        )}

        {/* Step 2 — date, time, party size */}
        {step === 2 && (
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div className="rounded-xl px-3 py-2.5" style={{ background: "var(--surface-2)", border: "1px solid var(--border)" }}>
              <p className="text-xs" style={{ color: "var(--text-muted)" }}>Cliente</p>
              <p className="text-sm font-semibold" style={{ color: "var(--text)" }}>{selectedCustomer?.name}</p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold mb-1" style={{ color: "var(--text-secondary)" }}>Data *</label>
                <input type="date" value={form.date} min={todayStr}
                  onChange={e => set("date", e.target.value)}
                  className="w-full rounded-xl px-3 py-2 text-sm outline-none"
                  style={{ background: "var(--surface-2)", border: "1px solid var(--border)", color: "var(--text)" }} />
              </div>
              <div>
                <label className="block text-xs font-semibold mb-1" style={{ color: "var(--text-secondary)" }}>Hora *</label>
                <input type="time" value={form.time}
                  onChange={e => set("time", e.target.value)}
                  className="w-full rounded-xl px-3 py-2 text-sm outline-none"
                  style={{ background: "var(--surface-2)", border: "1px solid var(--border)", color: "var(--text)" }} />
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1" style={{ color: "var(--text-secondary)" }}>Nº de Pessoas</label>
              <input type="number" min="1" max="20" value={form.party_size}
                onChange={e => set("party_size", e.target.value)}
                className="w-full rounded-xl px-3 py-2 text-sm outline-none"
                style={{ background: "var(--surface-2)", border: "1px solid var(--border)", color: "var(--text)" }} />
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1" style={{ color: "var(--text-secondary)" }}>Contacto</label>
              <input type="tel" value={form.phone} placeholder={selectedCustomer?.phone || "555-0000"}
                onChange={e => set("phone", e.target.value)}
                className="w-full rounded-xl px-3 py-2 text-sm outline-none"
                style={{ background: "var(--surface-2)", border: "1px solid var(--border)", color: "var(--text)" }} />
            </div>
            {err && <p className="text-xs text-red-500">{err}</p>}
            <div className="flex gap-2 pt-1">
              <button type="button" onClick={onClose}
                className="flex-1 py-2 rounded-xl text-sm font-semibold"
                style={{ background: "var(--surface-2)", color: "var(--text-secondary)" }}>
                Cancelar
              </button>
              <button type="submit" disabled={saving}
                className="flex-1 py-2 rounded-xl text-sm font-semibold text-white disabled:opacity-60"
                style={{ background: "var(--primary)" }}>
                {saving ? <i className="fa-solid fa-spinner fa-spin" /> : "Reservar"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

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
  const [showCreateMesa, setShowCreateMesa] = useState(false);
  const [showAtribuirMesa, setShowAtribuirMesa] = useState(false);
  const [showReservar, setShowReservar] = useState(false);
  const [fecharMesaData, setFecharMesaData] = useState(null);
  const { tableRefreshCount, ordersRefreshCount } = useTableRefresh();
  const selectedTableIdRef = useRef(selectedTableId);
  useEffect(() => { selectedTableIdRef.current = selectedTableId; }, [selectedTableId]);

  const fetchMesas = useCallback(async ({ silent = false } = {}) => {
    try {
      if (!silent) { setLoading(true); setError(null); }
      setMesas(await tableService.getAll());
      if (!silent) setError(null);
    } catch (err) {
      if (!silent) setError(err.message || "Não foi possível carregar as mesas.");
    } finally {
      if (!silent) setLoading(false);
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
      const [orders, reservations] = await Promise.all([
        orderService.getAll(),
        reservationService.getAll(),
      ]);
      const map = {};

      for (const order of (Array.isArray(orders) ? orders : [])) {
        if (!order.table_id) continue;
        if (order.order_status === 'Cancelled') continue;

        if (!map[order.table_id]) map[order.table_id] = { emojis: [], customerName: null };

        if (!map[order.table_id].customerName && order.customer_name) {
          map[order.table_id].customerName = order.customer_name;
        }

        if (order.order_status === 'Delivered') {
          const items = (() => {
            try {
              return Array.isArray(order.kitchen_sequence_json)
                ? order.kitchen_sequence_json
                : JSON.parse(order.kitchen_sequence_json || '[]');
            } catch { return []; }
          })();
          const newEmojis = [...new Set(items.map(n => getItemEmoji(n)))];
          map[order.table_id].emojis = [...new Set([...map[order.table_id].emojis, ...newEmojis])];
        }
      }

      for (const res of (Array.isArray(reservations) ? reservations : [])) {
        if (!res.table_id) continue;
        if (res.status === 'Cancelled') continue;
        if (!map[res.table_id]) map[res.table_id] = { emojis: [], customerName: null };
        if (!map[res.table_id].customerName && res.customer_name) {
          map[res.table_id].customerName = res.customer_name;
        }
      }

      setTableOccupancy(map);
    } catch { /* silently ignore */ }
  }, []);

  useEffect(() => {
    fetchMesas(); fetchOccupancy();
    const id = setInterval(() => { fetchMesas(); fetchOccupancy(); }, 30_000);
    return () => clearInterval(id);
  }, [fetchMesas, fetchOccupancy]);
  useEffect(() => { fetchTableDetails(selectedTableId); }, [selectedTableId, fetchTableDetails]);

  // Reage a mutações do chatbot (assign table, create order, etc.) via Context
  useEffect(() => {
    if (!tableRefreshCount) return;
    fetchMesas({ silent: true });
    fetchOccupancy();
    if (selectedTableIdRef.current) fetchTableDetails(selectedTableIdRef.current);
  }, [tableRefreshCount, fetchMesas, fetchOccupancy, fetchTableDetails]);

  // Re-fetch occupancy quando o KDS muda status de um pedido
  useEffect(() => {
    if (!ordersRefreshCount) return;
    fetchOccupancy();
  }, [ordersRefreshCount, fetchOccupancy]);

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

  const handleFecharMesa = async () => {
    if (!activeOrder?.id) return;
    setActionLoading(true); setDetailsError(null);
    try {
      const subtotal = parseFloat(Number(activeOrder.total_amount ?? 0).toFixed(2));
      const tax      = parseFloat((subtotal * 0.23).toFixed(2));
      const total    = parseFloat((subtotal + tax).toFixed(2));
      const profit_margin = parseFloat((subtotal * 0.30).toFixed(2));

      let invoice;
      try {
        invoice = await invoiceService.create({ order_id: activeOrder.id, subtotal_amount: subtotal, tax_amount: tax, total_amount: total, profit_margin });
      } catch (e) {
        if (e?.message?.includes("409")) {
          invoice = await invoiceService.getByOrder(activeOrder.id);
        } else throw e;
      }
      setFecharMesaData({ invoice, customerId: activeOrder.customer_id ?? null });
    } catch (err) {
      setDetailsError(err.message || "Erro ao fechar mesa.");
    } finally {
      setActionLoading(false);
    }
  };

  const handleFecharMesaPaid = async () => {
    try {
      if (activeOrder?.id)   await orderService.updateStatus(activeOrder.id, "Delivered");
      if (selectedTable?.id) await tableService.updateStatus(selectedTable.id, "Available");
      await Promise.all([fetchMesas({ silent: true }), fetchOccupancy()]);
      setSelectedTableId(null);
    } catch { /* silently ignore */ }
    setFecharMesaData(null);
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
  const isAvailable       = selectedTable?.status === "Available";
  const isOccupied        = selectedTable?.status === "Occupied";

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
      {showCreateMesa && (
        <NovaMesaModal
          onClose={() => setShowCreateMesa(false)}
          onCreate={() => { setShowCreateMesa(false); fetchMesas(); }}
        />
      )}

      {showAtribuirMesa && selectedTable && (
        <AtribuirMesaModal
          table={selectedTable}
          onClose={() => setShowAtribuirMesa(false)}
          onAssigned={() => {
            setShowAtribuirMesa(false);
            fetchMesas({ silent: true });
            fetchOccupancy();
            fetchTableDetails(selectedTableId);
          }}
        />
      )}

      {showReservar && selectedTable && (
        <ReservarModal
          table={selectedTable}
          onClose={() => setShowReservar(false)}
          onReserved={() => {
            setShowReservar(false);
            fetchMesas({ silent: true });
            fetchOccupancy();
            fetchTableDetails(selectedTableId);
          }}
        />
      )}

      {fecharMesaData && (
        <PaymentModal
          unpaidInvoices={[{ inv: fecharMesaData.invoice }]}
          customerId={fecharMesaData.customerId}
          onClose={() => setFecharMesaData(null)}
          onPaid={handleFecharMesaPaid}
        />
      )}

      <div className="flex items-center justify-between gap-3">
        <h2 className="text-2xl sm:text-3xl font-bold text-[var(--text)]">Mesas</h2>
        <button
          onClick={() => setShowCreateMesa(true)}
          className="flex items-center gap-1.5 px-3 sm:px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold text-white flex-shrink-0 whitespace-nowrap"
          style={{ background: "var(--primary)" }}
        >
          <i className="fa-solid fa-plus text-[10px] sm:text-xs" />
          Nova Mesa
        </button>
      </div>

      {/* Mobile: ícones compactos 2x2 com badge; Desktop: StatCards */}
      <div className="grid grid-cols-4 gap-2 sm:hidden">
        {[
          { label: "Total",     value: totals.total,    icon: "fa-solid fa-table-cells",    color: "#3b82f6" },
          { label: "Ocupadas",  value: totals.ocupada,  icon: "fa-solid fa-chair",           color: "#f59e0b" },
          { label: "Livres",    value: totals.livre,    icon: "fa-solid fa-check-circle",    color: "#22c55e" },
          { label: "Reservadas",value: totals.reservada,icon: "fa-solid fa-calendar-check",  color: "#8b5cf6" },
        ].map(({ label, value, icon, color }) => (
          <div key={label} className="relative flex flex-col items-center justify-center gap-1 rounded-2xl py-3"
            style={{ background: "var(--surface)" }}>
            <i className={`${icon} text-xl`} style={{ color }} />
            <span className="text-[10px] font-medium text-center leading-tight" style={{ color: "var(--text-muted)" }}>{label}</span>
            <span
              className="absolute -top-1.5 -right-1.5 w-5 h-5 flex items-center justify-center rounded-full text-[10px] font-bold"
              style={{ background: color, color: "#fff" }}
            >
              {value}
            </span>
          </div>
        ))}
      </div>
      <div className="hidden sm:grid gap-4 sm:grid-cols-2 md:grid-cols-4">
        <StatCard label="Total Mesas"  value={totals.total}     icon="fa-solid fa-table-cells"    borderColor="#3b82f6" className="bg-surface" />
        <StatCard label="Ocupadas"     value={totals.ocupada}   icon="fa-solid fa-chair"           borderColor="#f59e0b" className="bg-surface" />
        <StatCard label="Livres"       value={totals.livre}     icon="fa-solid fa-check-circle"    borderColor="#22c55e" className="bg-surface" />
        <StatCard label="Reservadas"   value={totals.reservada} icon="fa-solid fa-calendar-check"  borderColor="#8b5cf6" className="bg-surface" />
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
                    {(() => {
                      const isConfirmed = activeReservation?.status === "Confirmed";
                      const confirmDisabled = !activeReservation || actionLoading || isConfirmed;
                      return (
                        <button
                          className={`flex-1 rounded-full px-4 py-3 text-sm font-semibold text-white transition ${
                            !confirmDisabled
                              ? "bg-[var(--primary)] hover:bg-[var(--primary-hover)]"
                              : "bg-[var(--surface-2)] text-[var(--text-secondary)] cursor-not-allowed"
                          }`}
                          type="button"
                          disabled={confirmDisabled}
                          onClick={handleConfirmReservation}
                        >
                          {actionLoading ? "A processar..." : isConfirmed ? "Reserva confirmada ✓" : "Confirmar reserva"}
                        </button>
                      );
                    })()}
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
                        <div className="grid grid-cols-2 gap-2">
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

                  {/* Ações para mesa OCUPADA */}
                  {isOccupied && (
                    <div className="mt-6">
                      <button
                        onClick={handleFecharMesa}
                        disabled={actionLoading || !activeOrder}
                        className="w-full rounded-full px-4 py-3 text-sm font-semibold text-white transition disabled:opacity-60"
                        style={{ background: "#ef4444" }}
                      >
                        {actionLoading ? "A processar..." : "Fechar Mesa e Pagar"}
                      </button>
                    </div>
                  )}

                  {/* Ações para mesa LIVRE */}
                  {isAvailable && (
                    <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                      <button
                        onClick={() => setShowAtribuirMesa(true)}
                        className="flex-1 rounded-full px-4 py-3 text-sm font-semibold text-white transition"
                        style={{ background: "var(--primary)" }}
                      >
                        <i className="fa-solid fa-user-plus mr-2 text-xs" />
                        Atribuir Mesa
                      </button>
                      <button
                        onClick={() => setShowReservar(true)}
                        className="flex-1 rounded-full border border-[var(--border)] px-4 py-3 text-sm font-semibold transition bg-[var(--surface)] text-[var(--text)] hover:bg-[var(--surface-2)]"
                      >
                        <i className="fa-solid fa-calendar-plus mr-2 text-xs" />
                        Reservar
                      </button>
                    </div>
                  )}

                </>
              )}
            </div>
          )}
        </div>
      )}
    </PageSection>
  );
}
