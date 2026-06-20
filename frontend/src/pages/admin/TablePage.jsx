import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTheme } from "@/context/ThemeContext";
import { useTableRefresh } from "@/context/TableRefreshContext";
import { reservationService, tableService, orderService, userService, invoiceService, itemService, orderItemService } from "@/services";
import { STATUS_CONFIG } from "@/utils/tablePageUtils";
import { getItemEmoji, formatMenuPrice } from "@/utils";
import { MENU_CATEGORY_META } from "@/utils/menuUtils";
import { PageSection, StatCard, TableCard, PaymentModal } from "@/components";

const formatTableLabel = (number) => `T${String(number).padStart(2, "0")}`;

/* ── FazerPedidoModal ── */
function FazerPedidoModal({ order, onClose, onPlaced }) {
  const [menuItems, setMenuItems] = useState([]);
  const [loading, setLoading]     = useState(true);
  const [cart, setCart]           = useState({});
  const [saving, setSaving]       = useState(false);
  const [err, setErr]             = useState("");

  useEffect(() => {
    itemService.getActive()
      .then(data => setMenuItems(Array.isArray(data) ? data : []))
      .catch(() => setErr("Erro ao carregar o menu."))
      .finally(() => setLoading(false));
  }, []);

  const cartItems = Object.values(cart).filter(c => c.qty > 0);
  const cartTotal = cartItems.reduce((s, c) => s + Number(c.item.price) * c.qty, 0);
  const cartCount = cartItems.reduce((s, c) => s + c.qty, 0);

  const addItem = (item) =>
    setCart(prev => ({ ...prev, [item.id]: { item, qty: (prev[item.id]?.qty || 0) + 1 } }));
  const removeItem = (itemId) =>
    setCart(prev => {
      const qty = (prev[itemId]?.qty || 0) - 1;
      if (qty <= 0) { const next = { ...prev }; delete next[itemId]; return next; }
      return { ...prev, [itemId]: { ...prev[itemId], qty } };
    });

  const handleSubmit = async () => {
    if (!cartItems.length) return;
    setSaving(true); setErr("");
    try {
      await orderItemService.createBulk({
        order_id: order.id,
        items: cartItems.map(c => ({ item_id: c.item.id, quantity: c.qty })),
      });

      const existing = (() => {
        try {
          const raw = order.kitchen_sequence_json;
          return Array.isArray(raw) ? raw : JSON.parse(raw || "[]");
        } catch { return []; }
      })();
      const newNames = cartItems.flatMap(c => Array(c.qty).fill(c.item.name));

      await orderService.update(order.id, {
        kitchen_sequence_json: JSON.stringify([...existing, ...newNames]),
        order_status: "Pending",
      });

      onPlaced();
      onClose();
    } catch {
      setErr("Erro ao registar pedido. Tente novamente.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.6)" }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="rounded-[24px] w-full max-w-lg shadow-2xl flex flex-col"
        style={{ background: "var(--surface)", border: "1px solid var(--border)", maxHeight: "85vh" }}>

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b flex-shrink-0"
          style={{ borderColor: "var(--border)" }}>
          <h2 className="text-base font-bold" style={{ color: "var(--text)" }}>
            <i className="fa-solid fa-utensils mr-2" style={{ color: "var(--primary)" }} />
            Fazer Pedido
          </h2>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-xl"
            style={{ background: "var(--surface-2)", color: "var(--text-muted)" }}>
            <i className="fa-solid fa-xmark text-sm" />
          </button>
        </div>

        {/* Menu */}
        <div className="flex-1 overflow-y-auto px-5 py-4">
          {loading ? (
            <p className="text-center py-8" style={{ color: "var(--text-muted)" }}>
              <i className="fa-solid fa-spinner fa-spin mr-2" />A carregar menu...
            </p>
          ) : err && !menuItems.length ? (
            <p className="text-xs text-center py-8" style={{ color: "#ef4444" }}>{err}</p>
          ) : (
            <div className="flex flex-col gap-4">
              {Object.entries(MENU_CATEGORY_META).map(([catKey, catMeta]) => {
                const catItems = menuItems.filter(i => i.category === catKey);
                if (!catItems.length) return null;
                return (
                  <div key={catKey}>
                    {/* Cabeçalho de categoria */}
                    <div className="flex items-center gap-2 mb-2">
                      <span>{catMeta.emoji}</span>
                      <span className="text-xs font-bold uppercase tracking-widest" style={{ color: "var(--text-muted)" }}>
                        {catMeta.label}
                      </span>
                      <div className="flex-1 h-px ml-1" style={{ background: "var(--border)" }} />
                    </div>
                    <div className="flex flex-col gap-2">
                      {catItems.map(item => {
                        const qty = cart[item.id]?.qty || 0;
                        return (
                          <div key={item.id}
                            className="flex items-center justify-between px-3 py-2.5 rounded-xl transition-colors"
                            style={{
                              background: qty > 0 ? "rgba(99,102,241,0.08)" : "var(--surface-2)",
                              border: qty > 0 ? "1.5px solid var(--primary)" : "1px solid var(--border)",
                            }}>
                            <div className="flex items-center gap-2.5 min-w-0">
                              <span style={{ fontSize: 20 }}>{getItemEmoji(item.name)}</span>
                              <div className="min-w-0">
                                <p className="text-sm font-semibold truncate" style={{ color: "var(--text)" }}>{item.name}</p>
                                <p className="text-xs font-semibold" style={{ color: "var(--primary)" }}>
                                  {formatMenuPrice(item.price)}
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center gap-2 flex-shrink-0">
                              {qty > 0 && (
                                <>
                                  <button onClick={() => removeItem(item.id)}
                                    className="w-7 h-7 rounded-full flex items-center justify-center font-bold text-sm"
                                    style={{ background: "var(--surface)", color: "var(--text)", border: "1px solid var(--border)" }}>
                                    −
                                  </button>
                                  <span className="text-sm font-bold w-5 text-center" style={{ color: "var(--primary)" }}>{qty}</span>
                                </>
                              )}
                              <button onClick={() => addItem(item)}
                                className="w-7 h-7 rounded-full flex items-center justify-center font-bold text-sm text-white"
                                style={{ background: "var(--primary)" }}>
                                +
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-4 border-t flex-shrink-0 flex flex-col gap-3"
          style={{ borderColor: "var(--border)" }}>
          {err && cartItems.length === 0 && <p className="text-xs" style={{ color: "#ef4444" }}>{err}</p>}
          <div className="flex items-center justify-between">
            <span className="text-sm" style={{ color: "var(--text-muted)" }}>
              {cartCount > 0 ? `${cartCount} item${cartCount !== 1 ? "s" : ""}` : "Nenhum item selecionado"}
            </span>
            <span className="text-lg font-bold" style={{ color: "var(--primary)" }}>
              {formatMenuPrice(cartTotal)}
            </span>
          </div>
          <button
            onClick={handleSubmit}
            disabled={saving || cartItems.length === 0}
            className="w-full py-3 rounded-2xl text-sm font-bold text-white disabled:opacity-50 transition-opacity"
            style={{ background: "var(--primary)" }}>
            {saving ? <i className="fa-solid fa-spinner fa-spin mr-2" /> : null}
            {saving ? "A registar..." : "Confirmar pedido"}
          </button>
        </div>
      </div>
    </div>
  );
}

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

/* ── CustomerCombobox ── */
function CustomerCombobox({ customers, loading, err, onSelect, placeholder = "Pesquisar cliente…" }) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const containerRef = useRef(null);

  useEffect(() => {
    const handler = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const filtered = customers.filter(c =>
    c.name?.toLowerCase().includes(query.toLowerCase()) || c.phone?.includes(query),
  );

  return (
    <div ref={containerRef} className="relative">
      <input
        autoFocus
        type="text"
        value={query}
        onChange={e => { setQuery(e.target.value); setOpen(true); }}
        onFocus={() => setOpen(true)}
        placeholder={placeholder}
        className="w-full rounded-xl px-3 py-2 text-sm outline-none"
        style={{ background: "var(--surface-2)", border: "1px solid var(--border)", color: "var(--text)" }}
      />
      {open && (
        <div className="absolute left-0 right-0 top-full mt-1 rounded-xl shadow-xl z-20 overflow-y-auto"
          style={{ background: "var(--surface)", border: "1px solid var(--border)", maxHeight: 220 }}>
          {loading ? (
            <p className="px-3 py-3 text-sm text-center" style={{ color: "var(--text-muted)" }}>
              <i className="fa-solid fa-spinner fa-spin mr-1" />A carregar...
            </p>
          ) : err ? (
            <p className="px-3 py-3 text-xs text-center" style={{ color: "#ef4444" }}>{err}</p>
          ) : filtered.length === 0 ? (
            <p className="px-3 py-3 text-sm text-center" style={{ color: "var(--text-muted)" }}>Nenhum cliente encontrado.</p>
          ) : (
            filtered.map(c => (
              <button key={c.id} type="button"
                onClick={() => { onSelect(c); setQuery(""); setOpen(false); }}
                className="flex items-center justify-between w-full px-3 py-2.5 text-left transition-colors hover:bg-[var(--surface-2)]"
                style={{ borderBottom: "1px solid var(--border)" }}>
                <div>
                  <p className="text-sm font-semibold" style={{ color: "var(--text)" }}>{c.name}</p>
                  {c.phone && <p className="text-xs" style={{ color: "var(--text-muted)" }}>{c.phone}</p>}
                </div>
                <i className="fa-solid fa-arrow-right text-xs" style={{ color: "var(--primary)" }} />
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}

/* ── AtribuirMesaModal ── */
function AtribuirMesaModal({ table, onClose, onAssigned }) {
  const [step, setStep]               = useState(1);      // 1=cliente, 2=nº pessoas
  const [customers, setCustomers]     = useState([]);
  const [allTables, setAllTables]     = useState([]);
  const [loading, setLoading]         = useState(true);
  const [assigning, setAssigning]     = useState(false);
  const [err, setErr]                 = useState("");
  const [selectedUser, setSelectedUser] = useState(null);
  const [partySize, setPartySize]     = useState("");

  useEffect(() => {
    (async () => {
      try {
        const [allUsers, allOrders, tables] = await Promise.all([
          userService.getAll(),
          orderService.getAll(),
          tableService.getAll(),
        ]);
        const seatedIds = new Set(
          (Array.isArray(allOrders) ? allOrders : [])
            .filter(o => o.table_id && !["Cancelled", "Delivered", "Done"].includes(o.order_status))
            .map(o => o.user_id)
            .filter(Boolean),
        );
        setCustomers(
          (Array.isArray(allUsers) ? allUsers : []).filter(
            c => c.active && c.role_id !== 1 && !seatedIds.has(c.id),
          ),
        );
        setAllTables(Array.isArray(tables) ? tables : []);
      } catch {
        setErr("Erro ao carregar dados.");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const handleSelectUser = (user) => {
    setSelectedUser(user);
    setPartySize("");
    setErr("");
    setStep(2);
  };

  // Encontra a melhor mesa disponível para o nº de pessoas
  const findBestTable = (size) => {
    const available = allTables.filter(t => t.status === "Available" && t.capacity >= size);
    if (!available.length) return null;
    // Melhor encaixe: mesa disponível com menor capacidade que ainda caiba o grupo
    return available.sort((a, b) => a.capacity - b.capacity)[0];
  };

  const handleConfirm = async () => {
    const size = parseInt(partySize);
    if (!size || size < 1) return setErr("Indica o número de pessoas.");

    const assignTable = findBestTable(size);
    if (!assignTable) {
      return setErr(`Não há mesa disponível para ${size} ${size === 1 ? "pessoa" : "pessoas"}. Liberta uma mesa com capacidade suficiente.`);
    }

    setAssigning(true); setErr("");
    try {
      await orderService.create({
        user_id: selectedUser.id,
        table_id: assignTable.id,
        service_type: "Table",
        order_status: "Pending",
        kitchen_sequence_json: [],
        allergy_restrictions: "",
      });
      await tableService.updateStatus(assignTable.id, "Occupied");
      onAssigned();
      onClose();
    } catch {
      setErr("Erro ao atribuir mesa. Tente novamente.");
      setAssigning(false);
    }
  };

  // Preview da mesa que vai ser atribuída
  const previewTable = partySize && parseInt(partySize) >= 1 ? findBestTable(parseInt(partySize)) : null;
  const sizeOk = previewTable?.id === table.id;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.5)" }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="rounded-[24px] p-6 w-full max-w-sm shadow-2xl flex flex-col gap-4"
        style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>

        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {step === 2 && (
              <button onClick={() => { setStep(1); setSelectedUser(null); setErr(""); }}
                className="w-7 h-7 flex items-center justify-center rounded-lg"
                style={{ background: "var(--surface-2)", color: "var(--text-muted)" }}>
                <i className="fa-solid fa-arrow-left text-xs" />
              </button>
            )}
            <h2 className="text-lg font-bold" style={{ color: "var(--text)" }}>Atribuir Mesa</h2>
          </div>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-xl"
            style={{ background: "var(--surface-2)", color: "var(--text-muted)" }}>
            <i className="fa-solid fa-xmark text-sm" />
          </button>
        </div>

        {/* Progress */}
        <div className="flex gap-2">
          {[1, 2].map(s => (
            <div key={s} className="h-1 flex-1 rounded-full transition-colors"
              style={{ background: s <= step ? "var(--primary)" : "var(--border)" }} />
          ))}
        </div>

        {assigning ? (
          <p className="text-center text-sm py-6" style={{ color: "var(--text-muted)" }}>
            <i className="fa-solid fa-spinner fa-spin mr-2" />A atribuir mesa...
          </p>
        ) : step === 1 ? (
          /* Passo 1 — Escolher cliente */
          <CustomerCombobox customers={customers} loading={loading} err={err} onSelect={handleSelectUser} />
        ) : (
          /* Passo 2 — Nº de pessoas */
          <div className="flex flex-col gap-4">
            {/* Cliente seleccionado */}
            <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl"
              style={{ background: "var(--surface-2)", border: "1px solid var(--border)" }}>
              <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold"
                style={{ background: "var(--primary)", color: "#fff" }}>
                {selectedUser.name[0].toUpperCase()}
              </div>
              <div>
                <p className="text-sm font-semibold" style={{ color: "var(--text)" }}>{selectedUser.name}</p>
                {selectedUser.phone && <p className="text-xs" style={{ color: "var(--text-muted)" }}>{selectedUser.phone}</p>}
              </div>
            </div>

            {/* Nº de pessoas */}
            <div>
              <label className="block text-xs font-semibold mb-1.5" style={{ color: "var(--text-secondary)" }}>
                Quantas pessoas?
              </label>
              <input
                type="number" min="1" max="20"
                value={partySize}
                onChange={e => { setPartySize(e.target.value); setErr(""); }}
                placeholder="Ex: 2"
                className="w-full rounded-xl px-3 py-2.5 text-sm outline-none"
                style={{ background: "var(--surface-2)", border: "1.5px solid var(--border)", color: "var(--text)" }}
                autoFocus
              />
            </div>

            {/* Preview da mesa atribuída */}
            {previewTable && (
              <div className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs"
                style={{
                  background: sizeOk ? "rgba(34,197,94,0.08)" : "rgba(245,158,11,0.08)",
                  border: `1px solid ${sizeOk ? "rgba(34,197,94,0.3)" : "rgba(245,158,11,0.3)"}`,
                  color: sizeOk ? "#22c55e" : "#f59e0b",
                }}>
                <i className={`fa-solid ${sizeOk ? "fa-circle-check" : "fa-triangle-exclamation"} text-sm`} />
                {sizeOk
                  ? `Mesa ${table.table_number} tem capacidade (${table.capacity} lugares) ✓`
                  : `Mesa ${table.table_number} só tem ${table.capacity} lugares. Será atribuída a mesa ${previewTable.table_number} (${previewTable.capacity} lugares).`
                }
              </div>
            )}

            {/* Sem mesa disponível */}
            {partySize && parseInt(partySize) >= 1 && !previewTable && (
              <div className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs"
                style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.3)", color: "#ef4444" }}>
                <i className="fa-solid fa-circle-xmark text-sm" />
                Sem mesa disponível para {partySize} {parseInt(partySize) === 1 ? "pessoa" : "pessoas"}.
              </div>
            )}

            {err && <p className="text-xs" style={{ color: "#ef4444" }}>{err}</p>}

            <button
              onClick={handleConfirm}
              disabled={!partySize || parseInt(partySize) < 1 || !previewTable}
              className="w-full py-3 rounded-2xl text-sm font-bold text-white disabled:opacity-40 transition-opacity"
              style={{ background: "var(--primary)" }}>
              <i className="fa-solid fa-chair mr-2" />
              Confirmar Atribuição
            </button>
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
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const todayStr = new Date().toISOString().split("T")[0];
  const [form, setForm] = useState({ date: "", time: "19:00", party_size: "2", phone: "" });
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  useEffect(() => {
    userService.getAll()
      .then(data => setCustomers(Array.isArray(data) ? data.filter(c => c.active && c.role_id !== 1) : []))
      .catch(() => setErr("Erro ao carregar clientes."))
      .finally(() => setLoading(false));
  }, []);

  const handleSelectCustomer = (c) => {
    setSelectedCustomer(c);
    setForm(f => ({ ...f, phone: c.phone || "" }));
    setErr("");
    setStep(2);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.date) return setErr("Data obrigatória.");
    if (!form.time) return setErr("Hora obrigatória.");
    setSaving(true); setErr("");
    try {
      await reservationService.create({
        user_id: selectedCustomer.id,
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
            <CustomerCombobox customers={customers} loading={loading} err={step === 1 ? err : ""} onSelect={handleSelectCustomer} />
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
  const [showFazerPedido, setShowFazerPedido] = useState(false);
  const [fecharMesaData, setFecharMesaData] = useState(null);
  const [statusFilter, setStatusFilter] = useState(null); // null=todos | "Occupied" | "Available" | "Reserved"
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
        if (['Cancelled', 'Delivered', 'Done'].includes(order.order_status)) continue;

        if (!map[order.table_id]) map[order.table_id] = { emojis: [], customerName: null };

        if (!map[order.table_id].customerName && order.user_name) {
          map[order.table_id].customerName = order.user_name;
        }

        const items = (() => {
          try {
            return Array.isArray(order.kitchen_sequence_json)
              ? order.kitchen_sequence_json
              : JSON.parse(order.kitchen_sequence_json || '[]');
          } catch { return []; }
        })();
        if (items.length) {
          const newEmojis = [...new Set(items.map(n => getItemEmoji(n)))];
          map[order.table_id].emojis = [...new Set([...map[order.table_id].emojis, ...newEmojis])];
        }
      }

      for (const res of (Array.isArray(reservations) ? reservations : [])) {
        if (!res.table_id) continue;
        if (['Cancelled', 'Completed'].includes(res.status)) continue;
        if (!map[res.table_id]) map[res.table_id] = { emojis: [], customerName: null };
        if (!map[res.table_id].customerName && res.user_name) {
          map[res.table_id].customerName = res.user_name;
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
      const tax      = parseFloat((subtotal * 0.13).toFixed(2)); // IVA 13% taxa intermédia restauração
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
      setFecharMesaData({ invoice, userId: activeOrder.user_id ?? null });
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

  // Liberta a mesa sem pagamento (apenas mesas ≤ 2 lugares, sem pedido)
  const handleLiberarMesa = async () => {
    if (!activeOrder?.id) return;
    setActionLoading(true); setDetailsError(null);
    try {
      await orderService.updateStatus(activeOrder.id, "Cancelled");
      await tableService.updateStatus(selectedTableId, "Available");
      await Promise.all([fetchMesas({ silent: true }), fetchOccupancy()]);
      setSelectedTableId(null);
    } catch (err) {
      setDetailsError(err.message || "Erro ao libertar mesa.");
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

  const mesasFiltradas = useMemo(
    () => statusFilter ? mesas.filter(m => m.status === statusFilter) : mesas,
    [mesas, statusFilter],
  );

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

      {showFazerPedido && activeOrder && (
        <FazerPedidoModal
          order={activeOrder}
          onClose={() => setShowFazerPedido(false)}
          onPlaced={() => {
            setShowFazerPedido(false);
            fetchTableDetails(selectedTableId);
            fetchOccupancy();
          }}
        />
      )}

      {fecharMesaData && (
        <PaymentModal
          unpaidInvoices={[{ inv: fecharMesaData.invoice }]}
          userId={fecharMesaData.userId}
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

      {/* Stats — pills clicáveis para filtrar mesas */}
      <div className="flex items-center gap-2">
        {[
          { label: "Total Mesas", value: totals.total,    icon: "fa-solid fa-table-cells",   color: "#3b82f6", filter: null         },
          { label: "Ocupadas",    value: totals.ocupada,  icon: "fa-solid fa-chair",          color: "#f59e0b", filter: "Occupied"   },
          { label: "Livres",      value: totals.livre,    icon: "fa-solid fa-check-circle",   color: "#22c55e", filter: "Available"  },
          { label: "Reservadas",  value: totals.reservada,icon: "fa-solid fa-calendar-check", color: "#8b5cf6", filter: "Reserved"   },
        ].map(({ label, value, icon, color, filter }) => {
          const active = statusFilter === filter;
          return (
            <button key={label}
              type="button"
              title={label}
              onClick={() => setStatusFilter(active ? null : filter)}
              className="relative flex-1 flex items-center justify-center gap-1.5 rounded-full px-2 sm:px-4 py-2 sm:py-2.5 transition-all active:scale-95"
              style={{
                background: active ? "var(--primary)" : "var(--surface-2)",
                color: active ? "#fff" : "var(--text-secondary)",
              }}>
              <i className={`${icon} text-xs sm:text-sm`} style={{ color: active ? "#fff" : color }} />
              <span className="hidden sm:inline text-sm font-semibold whitespace-nowrap">{label}</span>
              {/* Mobile: badge absoluto */}
              <span className="sm:hidden absolute -top-1.5 -right-1 w-5 h-5 flex items-center justify-center rounded-full text-[10px] font-bold"
                style={{ background: active ? "rgba(255,255,255,0.9)" : color, color: active ? "var(--primary)" : "#fff" }}>
                {value}
              </span>
              {/* Desktop: badge inline */}
              <span className="hidden sm:inline rounded-full px-1.5 py-0.5 text-[10px] font-bold"
                style={{ background: active ? "rgba(255,255,255,0.3)" : color, color: "#fff" }}>
                {value}
              </span>
            </button>
          );
        })}
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
              {mesasFiltradas.length === 0 ? (
                <div className="col-span-full text-center py-16 text-[var(--text-secondary)]">
                  {statusFilter ? `Nenhuma mesa ${statusFilter === "Occupied" ? "ocupada" : statusFilter === "Available" ? "livre" : "reservada"}.` : "Nenhuma mesa encontrada."}
                </div>
              ) : (
                mesasFiltradas.map((mesa) => (
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
                        {detailsLoading ? "A carregar..." : (activeReservation?.user_name ?? "Sem cliente")}
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
                        {detailsLoading ? "A carregar..." : (activeOrder?.user_name ?? "Sem cliente")}
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
                  {isOccupied && !detailsLoading && (
                    <div className="mt-6 flex flex-col gap-3">
                      {(activeOrder?.items ?? 0) > 0 ? (
                        <>
                          <button
                            onClick={() => setShowFazerPedido(true)}
                            className="w-full rounded-full px-4 py-3 text-sm font-semibold text-white transition"
                            style={{ background: "var(--primary)" }}
                          >
                            <i className="fa-solid fa-plus mr-2 text-xs" />
                            Fazer mais pedido
                          </button>
                          <button
                            onClick={handleFecharMesa}
                            disabled={actionLoading}
                            className="w-full rounded-full px-4 py-3 text-sm font-semibold text-white transition disabled:opacity-60"
                            style={{ background: "#ef4444" }}
                          >
                            {actionLoading ? "A processar..." : "Fechar Mesa e Pagar"}
                          </button>
                        </>
                      ) : (
                        <div className="flex flex-col gap-3 sm:flex-row">
                          <button
                            onClick={() => setShowFazerPedido(true)}
                            className="flex-1 rounded-full px-4 py-3 text-sm font-semibold text-white transition"
                            style={{ background: "var(--primary)" }}
                          >
                            <i className="fa-solid fa-utensils mr-2 text-xs" />
                            Fazer Pedido
                          </button>
                          {(selectedTable?.capacity ?? 3) <= 2 ? (
                            // Mesa pequena (≤2 lug.) — consumo opcional
                            <button
                              onClick={handleLiberarMesa}
                              disabled={actionLoading}
                              className="flex-1 rounded-full px-4 py-3 text-sm font-semibold transition disabled:opacity-60"
                              style={{ background: "var(--surface-2)", color: "var(--text)", border: "1px solid var(--border)" }}
                            >
                              <i className="fa-solid fa-door-open mr-2 text-xs" />
                              {actionLoading ? "A libertar..." : "Fechar Mesa"}
                            </button>
                          ) : (
                            // Mesa grande (>2 lug.) — consumo obrigatório
                            <button
                              onClick={() => setDetailsError("Consumo obrigatório para mesas com mais de 2 lugares. Regista um pedido primeiro.")}
                              className="flex-1 rounded-full px-4 py-3 text-sm font-semibold transition opacity-50 cursor-not-allowed"
                              style={{ background: "var(--surface-2)", color: "var(--text-muted)", border: "1px solid var(--border)" }}
                            >
                              <i className="fa-solid fa-door-open mr-2 text-xs" />
                              Fechar Mesa
                            </button>
                          )}
                        </div>
                      )}
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
