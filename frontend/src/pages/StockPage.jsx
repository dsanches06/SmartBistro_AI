import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { PageSection, Pagination, ListCard } from "@/components";
import { stockService, ingredientService } from "@/services";
import {
  STOCK_PAGE_SIZE,
  STOCK_STATUS_META,
  filterStock,
  formatQty,
  getIngredientEmoji,
  getStockStatus,
  mergeStockWithIngredients,
} from "@/utils";

/* ── ProductIcon ── */
function ProductIcon({ name, size = 32 }) {
  const { emoji, bg } = getIngredientEmoji(name);
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        width: size,
        height: size,
        borderRadius: "50%",
        background: bg,
        fontSize: size * 0.5,
        flexShrink: 0,
      }}
    >
      {emoji}
    </span>
  );
}

/* ── StatusBadge ── */
function StatusBadge({ status }) {
  const m = STOCK_STATUS_META[status] ?? { label: status, bg: "#f3f4f6", color: "#9ca3af", text: "#4b5563" };
  return (
    <span
      style={{
        display: "inline-block",
        backgroundColor: m.bg,
        color: m.text,
        border: `1px solid ${m.color}40`,
        borderRadius: 999,
        padding: "2px 10px",
        fontSize: 12,
        fontWeight: 600,
        whiteSpace: "nowrap",
      }}
    >
      {m.label}
    </span>
  );
}

/* ── Inline quantity editor ── */
function QtyEditor({ item, onSave, onCancel, saving }) {
  const [val, setVal] = useState(String(item.available_quantity));
  const inputRef = useRef(null);

  useEffect(() => { inputRef.current?.focus(); inputRef.current?.select(); }, []);

  const confirm = () => {
    const n = parseFloat(val.replace(",", "."));
    if (!isNaN(n) && n >= 0) onSave(n);
  };

  return (
    <div className="flex items-center gap-1.5">
      <input
        ref={inputRef}
        type="number"
        min="0"
        step="0.01"
        value={val}
        onChange={e => setVal(e.target.value)}
        onKeyDown={e => { if (e.key === "Enter") confirm(); if (e.key === "Escape") onCancel(); }}
        className="w-24 rounded-lg px-2 py-1 text-sm font-semibold text-right outline-none"
        style={{ border: "1.5px solid var(--primary)", background: "var(--surface)", color: "var(--text)" }}
      />
      <button
        onClick={confirm}
        disabled={saving}
        title="Guardar"
        className="w-7 h-7 inline-flex items-center justify-center rounded-lg transition-colors disabled:opacity-50"
        style={{ background: "#22c55e", color: "#fff" }}
      >
        {saving ? <i className="fa-solid fa-spinner fa-spin text-xs" /> : <i className="fa-solid fa-check text-xs" />}
      </button>
      <button
        onClick={onCancel}
        disabled={saving}
        title="Cancelar"
        className="w-7 h-7 inline-flex items-center justify-center rounded-lg transition-colors disabled:opacity-50"
        style={{ background: "var(--surface-2)", color: "var(--text-secondary)" }}
      >
        <i className="fa-solid fa-xmark text-xs" />
      </button>
    </div>
  );
}

/* ── Desktop table row ── */
function StockRow({ item, editingId, savingId, onEdit, onSave, onCancel }) {
  const isEditing = editingId === item.id;
  const isSaving  = savingId  === item.id;

  return (
    <tr
      className="border-b border-[var(--border)] transition-colors"
      onMouseEnter={e => { e.currentTarget.style.background = "var(--surface-2)"; }}
      onMouseLeave={e => { e.currentTarget.style.background = ""; }}
    >
      <td className="py-2 pl-4 pr-2 w-12">
        <ProductIcon name={item.name} />
      </td>
      <td className="py-3 px-4 text-sm font-semibold" style={{ color: "var(--text)" }}>
        {item.name}
      </td>
      <td className="py-3 px-4">
        {isEditing ? (
          <QtyEditor item={item} onSave={onSave} onCancel={onCancel} saving={isSaving} />
        ) : (
          <span className="text-sm font-semibold tabular-nums" style={{ color: "var(--text)" }}>
            {formatQty(item.available_quantity)}
          </span>
        )}
      </td>
      <td className="py-3 px-4 text-sm" style={{ color: "var(--text-secondary)" }}>{item.unit}</td>
      <td className="py-3 px-4"><StatusBadge status={item.status} /></td>
      <td className="py-3 px-4">
        {!isEditing && (
          <button
            onClick={() => onEdit(item)}
            title="Atualizar stock"
            className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold border transition-colors"
            style={{ background: "var(--surface-2)", color: "var(--primary)", borderColor: "var(--border)" }}
            onMouseEnter={e => { e.currentTarget.style.background = "var(--primary)"; e.currentTarget.style.color = "#fff"; e.currentTarget.style.borderColor = "var(--primary)"; }}
            onMouseLeave={e => { e.currentTarget.style.background = "var(--surface-2)"; e.currentTarget.style.color = "var(--primary)"; e.currentTarget.style.borderColor = "var(--border)"; }}
          >
            <i className="fa-solid fa-pen-to-square text-xs" />
            Atualizar
          </button>
        )}
      </td>
    </tr>
  );
}

/* ── Mobile stock card ── */
function StockCard({ item, editingId, savingId, onEdit, onSave, onCancel }) {
  const isEditing = editingId === item.id;
  const isSaving  = savingId  === item.id;

  return (
    <ListCard>
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2.5 min-w-0">
          <ProductIcon name={item.name} size={36} />
          <span className="text-sm font-bold leading-tight truncate" style={{ color: "var(--text)" }}>
            {item.name}
          </span>
        </div>
        <StatusBadge status={item.status} />
      </div>
      <div className="flex items-center justify-between">
        {isEditing ? (
          <QtyEditor item={item} onSave={onSave} onCancel={onCancel} saving={isSaving} />
        ) : (
          <>
            <div className="flex items-baseline gap-1.5">
              <span className="text-base font-bold tabular-nums" style={{ color: "var(--text)" }}>
                {formatQty(item.available_quantity)}
              </span>
              <span className="text-xs" style={{ color: "var(--text-secondary)" }}>{item.unit}</span>
            </div>
            <button
              onClick={() => onEdit(item)}
              className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors"
              style={{ background: "var(--primary)", color: "#fff" }}
            >
              <i className="fa-solid fa-pen-to-square text-xs" />
              Atualizar
            </button>
          </>
        )}
      </div>
    </ListCard>
  );
}

/* ── StockPage ── */
export default function StockPage() {
  const [stockList, setStockList] = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [error,     setError]     = useState(null);
  const [search,    setSearch]    = useState("");
  const [page,      setPage]      = useState(1);
  const [editingId, setEditingId] = useState(null);
  const [savingId,  setSavingId]  = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    setEditingId(null);
    try {
      const [stock, ingredients] = await Promise.all([
        stockService.getAll(),
        ingredientService.getAll(),
      ]);
      setStockList(mergeStockWithIngredients(
        Array.isArray(stock)       ? stock       : [],
        Array.isArray(ingredients) ? ingredients : [],
      ));
    } catch (err) {
      console.error(err);
      setError("Não foi possível carregar o stock. Tente novamente.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { setPage(1); }, [search]);

  const filtered = useMemo(() => filterStock(stockList, search), [stockList, search]);
  const pageData = filtered.slice((page - 1) * STOCK_PAGE_SIZE, page * STOCK_PAGE_SIZE);

  const handleEdit   = (item) => setEditingId(item.id);
  const handleCancel = ()     => setEditingId(null);

  const handleSave = async (newQty) => {
    const item = stockList.find(s => s.id === editingId);
    if (!item) return;
    setSavingId(editingId);
    try {
      await stockService.update(item.id, { available_quantity: newQty, unit_cost: item.unit_cost });
      setStockList(prev =>
        prev.map(s => s.id === item.id
          ? { ...s, available_quantity: newQty, status: getStockStatus(newQty) }
          : s,
        ),
      );
      setEditingId(null);
    } catch (err) {
      console.error(err);
    } finally {
      setSavingId(null);
    }
  };

  return (
    <PageSection>
      <div className="rounded-[32px] bg-surface p-6 shadow-sm">

        {/* ── Header ── */}
        <div className="mb-5 space-y-3">

          {/* Linha 1 — título + acções */}
          <div className="flex items-center justify-between gap-2">
            <h1 className="text-2xl font-bold" style={{ color: "var(--text)" }}>Stock</h1>
            <div className="flex items-center gap-2">
              <button
                onClick={load}
                title="Atualizar"
                className="w-9 h-9 inline-flex items-center justify-center rounded-xl border border-[var(--border)] transition-colors"
                style={{ color: "var(--text-secondary)", background: "var(--surface-2)" }}
              >
                <i className={`fa-solid fa-rotate-right text-sm${loading ? " fa-spin" : ""}`} />
              </button>
              <button
                className="flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold text-white hover:opacity-90 transition-opacity"
                style={{ background: "var(--primary)" }}
              >
                <i className="fa-solid fa-plus text-xs" />
                <span>Novo Produto</span>
              </button>
            </div>
          </div>

          {/* Linha 2 — search + filtros */}
          <div className="flex items-center gap-2">
            <div
              className="flex flex-1 items-center gap-2 rounded-xl px-3 py-2"
              style={{ background: "var(--surface-2)", border: "1px solid var(--border)" }}
            >
              <i className="fa-solid fa-magnifying-glass text-sm" style={{ color: "var(--text-muted)" }} />
              <input
                type="text"
                placeholder="Pesquisar produto…"
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="flex-1 bg-transparent text-sm outline-none"
                style={{ color: "var(--text)" }}
              />
              {search && (
                <button onClick={() => setSearch("")} style={{ color: "var(--text-muted)" }}>
                  <i className="fa-solid fa-xmark text-xs" />
                </button>
              )}
            </div>
            <button
              className="flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold whitespace-nowrap"
              style={{ background: "var(--surface-2)", border: "1px solid var(--border)", color: "var(--text-secondary)" }}
            >
              <i className="fa-solid fa-sliders text-xs" />
              <span className="hidden sm:inline">Filtros</span>
            </button>
          </div>

        </div>

        {/* ── Content ── */}
        {loading ? (
          <div className="rounded-2xl p-12 text-center text-sm"
            style={{ background: "var(--surface-2)", color: "var(--text-secondary)" }}>
            <i className="fa-solid fa-spinner fa-spin mr-2" />
            A carregar stock…
          </div>
        ) : error ? (
          <div className="rounded-2xl p-10 text-center text-sm" style={{ background: "#fef2f2", color: "#991b1b" }}>
            <i className="fa-solid fa-circle-exclamation mr-2" />
            {error}
            <button onClick={load} className="ml-3 underline font-semibold">Tentar novamente</button>
          </div>
        ) : (
          <>
            {/* Desktop table */}
            <div className="hidden md:block overflow-x-auto rounded-2xl" style={{ border: "1px solid var(--border)" }}>
              <table className="w-full text-left">
                <thead>
                  <tr style={{ borderBottom: "1px solid var(--border)", background: "var(--surface-2)" }}>
                    {["", "Produto", "Stock Atual", "Unidade", "Estado", ""].map((h, i) => (
                      <th key={i} className="py-3 px-4 text-xs font-semibold uppercase tracking-wider"
                        style={{ color: "var(--text-secondary)" }}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {pageData.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-12 text-center text-sm" style={{ color: "var(--text-muted)" }}>
                        Nenhum produto encontrado.
                      </td>
                    </tr>
                  ) : (
                    pageData.map(item => (
                      <StockRow key={item.id} item={item}
                        editingId={editingId} savingId={savingId}
                        onEdit={handleEdit} onSave={handleSave} onCancel={handleCancel} />
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Mobile cards */}
            <div className="md:hidden flex flex-col gap-2.5">
              {pageData.length === 0 ? (
                <p className="py-10 text-center text-sm" style={{ color: "var(--text-muted)" }}>
                  Nenhum produto encontrado.
                </p>
              ) : (
                pageData.map(item => (
                  <StockCard key={item.id} item={item}
                    editingId={editingId} savingId={savingId}
                    onEdit={handleEdit} onSave={handleSave} onCancel={handleCancel} />
                ))
              )}
            </div>

            {/* Footer */}
            <div className="flex flex-wrap items-center justify-between gap-3 mt-4">
              <span className="text-sm" style={{ color: "var(--text-secondary)" }}>
                Total: <strong>{filtered.length}</strong> produto{filtered.length !== 1 ? "s" : ""}
              </span>
              <Pagination page={page} total={filtered.length} pageSize={STOCK_PAGE_SIZE} onChange={setPage} />
            </div>
          </>
        )}
      </div>
    </PageSection>
  );
}
