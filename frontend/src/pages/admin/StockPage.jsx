import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { PageSection, Pagination, ListCard } from "@/components";
import { SortTh } from "@/components/ui/shared/SortTh.jsx";
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

const UNITS = ["kg", "g", "L", "mL", "units"];

/* ── NovoProdutoModal ── */
function NovoProdutoModal({ onClose, onCreated }) {
  const [form, setForm] = useState({ name: "", unit: "kg", quantity: "0", unit_cost: "0.00" });
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) return setErr("Nome do produto obrigatório.");
    const quantity = parseFloat(form.quantity);
    const unit_cost = parseFloat(form.unit_cost);
    if (isNaN(quantity) || quantity < 0) return setErr("Quantidade inválida.");
    if (isNaN(unit_cost) || unit_cost < 0) return setErr("Custo inválido.");
    setSaving(true); setErr("");
    try {
      const ingredient = await ingredientService.create({ name: form.name.trim(), measurement_unit: form.unit });
      await stockService.create({ ingredient_id: ingredient.id, available_quantity: quantity, unit_cost });
      onCreated();
      onClose();
    } catch {
      setErr("Erro ao criar produto. O nome pode já existir.");
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
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-bold" style={{ color: "var(--text)" }}>Novo Produto</h2>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-xl"
            style={{ background: "var(--surface-2)", color: "var(--text-muted)" }}>
            <i className="fa-solid fa-xmark text-sm" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <label className="block text-xs font-semibold mb-1" style={{ color: "var(--text-secondary)" }}>Nome do Produto *</label>
            <input autoFocus type="text" value={form.name} onChange={e => set("name", e.target.value)}
              placeholder="Ex: Batata Doce"
              className="w-full rounded-xl px-3 py-2 text-sm outline-none"
              style={{ background: "var(--surface-2)", border: "1px solid var(--border)", color: "var(--text)" }} />
          </div>
          <div>
            <label className="block text-xs font-semibold mb-1" style={{ color: "var(--text-secondary)" }}>Unidade</label>
            <select value={form.unit} onChange={e => set("unit", e.target.value)}
              className="w-full rounded-xl px-3 py-2 text-sm outline-none"
              style={{ background: "var(--surface-2)", border: "1px solid var(--border)", color: "var(--text)" }}>
              {UNITS.map(u => <option key={u} value={u}>{u}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold mb-1" style={{ color: "var(--text-secondary)" }}>Quantidade inicial</label>
              <input type="number" min="0" step="0.01" value={form.quantity} onChange={e => set("quantity", e.target.value)}
                className="w-full rounded-xl px-3 py-2 text-sm outline-none"
                style={{ background: "var(--surface-2)", border: "1px solid var(--border)", color: "var(--text)" }} />
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1" style={{ color: "var(--text-secondary)" }}>Custo unitário (€)</label>
              <input type="number" min="0" step="0.01" value={form.unit_cost} onChange={e => set("unit_cost", e.target.value)}
                className="w-full rounded-xl px-3 py-2 text-sm outline-none"
                style={{ background: "var(--surface-2)", border: "1px solid var(--border)", color: "var(--text)" }} />
            </div>
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
              {saving ? <i className="fa-solid fa-spinner fa-spin" /> : "Criar Produto"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

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

/* ── Modal para actualizar stock ── */
function AtualizarStockModal({ item, onClose, onSave, saving }) {
  const [qty, setQty] = useState(String(item.available_quantity));

  const handleSubmit = (e) => {
    e.preventDefault();
    const n = parseFloat(qty.replace(",", "."));
    if (!isNaN(n) && n >= 0) onSave(n);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.5)" }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="rounded-[24px] p-6 w-full max-w-sm shadow-2xl"
        style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2.5">
            <ProductIcon name={item.name} />
            <h2 className="text-lg font-bold" style={{ color: "var(--text)" }}>Atualizar Stock</h2>
          </div>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-xl"
            style={{ background: "var(--surface-2)", color: "var(--text-muted)" }}>
            <i className="fa-solid fa-xmark text-sm" />
          </button>
        </div>
        <p className="text-sm mb-1 font-semibold" style={{ color: "var(--text)" }}>{item.name}</p>
        <p className="text-xs mb-4" style={{ color: "var(--text-muted)" }}>Unidade: {item.unit}</p>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <label className="block text-xs font-semibold mb-1.5" style={{ color: "var(--text-secondary)" }}>
              Quantidade ({item.unit})
            </label>
            <input
              autoFocus
              type="number" min="0" step="0.01"
              value={qty}
              onChange={e => setQty(e.target.value)}
              className="w-full rounded-xl px-3 py-2.5 text-sm font-semibold text-right outline-none"
              style={{ background: "var(--surface-2)", border: "1.5px solid var(--primary)", color: "var(--text)" }}
            />
          </div>
          <div className="flex gap-2">
            <button type="button" onClick={onClose}
              className="flex-1 py-2.5 rounded-xl text-sm font-semibold"
              style={{ background: "var(--surface-2)", color: "var(--text-secondary)" }}>
              Cancelar
            </button>
            <button type="submit" disabled={saving}
              className="flex-1 py-2.5 rounded-xl text-sm font-bold text-white disabled:opacity-60"
              style={{ background: "var(--primary)" }}>
              {saving ? <i className="fa-solid fa-spinner fa-spin" /> : "Guardar"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* ── Desktop table row ── */
function StockRow({ item, onEdit }) {
  return (
    <tr className="border-b border-[var(--border)] transition-colors hover:bg-[var(--surface-2)]">
      <td className="py-2 pl-4 pr-2 w-12"><ProductIcon name={item.name} /></td>
      <td className="py-3 px-4 text-sm font-semibold" style={{ color: "var(--text)" }}>{item.name}</td>
      <td className="py-3 px-4">
        <span className="text-sm font-semibold tabular-nums" style={{ color: "var(--text)" }}>
          {formatQty(item.available_quantity)}
        </span>
      </td>
      <td className="py-3 px-4 text-sm" style={{ color: "var(--text-secondary)" }}>{item.unit}</td>
      <td className="py-3 px-4"><StatusBadge status={item.status} /></td>
      <td className="py-3 px-4">
        <button onClick={() => onEdit(item)} title="Atualizar stock"
          className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold border transition-colors hover:bg-[var(--primary)] hover:text-white hover:border-[var(--primary)]"
          style={{ background: "var(--surface-2)", color: "var(--primary)", borderColor: "var(--border)" }}>
          <i className="fa-solid fa-pen-to-square text-xs" />
          Atualizar
        </button>
      </td>
    </tr>
  );
}

/* ── Mobile stock card ── */
function StockCard({ item, onEdit }) {
  return (
    <ListCard>
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2.5 min-w-0">
          <ProductIcon name={item.name} size={36} />
          <span className="text-sm font-bold leading-tight truncate" style={{ color: "var(--text)" }}>{item.name}</span>
        </div>
        <StatusBadge status={item.status} />
      </div>
      <div className="flex items-center justify-between">
        <div className="flex items-baseline gap-1.5">
          <span className="text-base font-bold tabular-nums" style={{ color: "var(--text)" }}>{formatQty(item.available_quantity)}</span>
          <span className="text-xs" style={{ color: "var(--text-secondary)" }}>{item.unit}</span>
        </div>
        <button onClick={() => onEdit(item)}
          className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors"
          style={{ background: "var(--primary)", color: "#fff" }}>
          <i className="fa-solid fa-pen-to-square text-xs" />
          Atualizar
        </button>
      </div>
    </ListCard>
  );
}

/* ── StockPage ── */
export default function StockPage() {
  const [stockList, setStockList] = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [error,     setError]     = useState(null);
  const [search,      setSearch]     = useState("");
  const [showSearch,  setShowSearch]  = useState(false);
  const [page,      setPage]      = useState(1);
  const [modalItem, setModalItem] = useState(null);   // item aberto no modal Atualizar
  const [saving,    setSaving]    = useState(false);
  const [showNovoProduto, setShowNovoProduto] = useState(false);
  const [sortCol, setSortCol] = useState(null);   // "name"|"qty"|"unit"|"status"
  const [sortDir, setSortDir] = useState("asc");  // "asc"|"desc"

  const handleSort = (col) => {
    if (sortCol === col) setSortDir(d => d === "asc" ? "desc" : "asc");
    else { setSortCol(col); setSortDir("asc"); }
  };

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    setModalItem(null);
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

  useEffect(() => {
    load();
    const id = setInterval(load, 30_000);
    return () => clearInterval(id);
  }, [load]);
  useEffect(() => { setPage(1); }, [search]);

  const filtered = useMemo(() => {
    const base = filterStock(stockList, search);
    if (!sortCol) return base;
    return [...base].sort((a, b) => {
      let va, vb;
      if (sortCol === "name")   { va = a.name?.toLowerCase() ?? ""; vb = b.name?.toLowerCase() ?? ""; }
      if (sortCol === "qty")    { va = Number(a.available_quantity); vb = Number(b.available_quantity); }
      if (sortCol === "unit")   { va = a.unit?.toLowerCase() ?? ""; vb = b.unit?.toLowerCase() ?? ""; }
      if (sortCol === "status") { va = a.status ?? ""; vb = b.status ?? ""; }
      if (va < vb) return sortDir === "asc" ? -1 : 1;
      if (va > vb) return sortDir === "asc" ?  1 : -1;
      return 0;
    });
  }, [stockList, search, sortCol, sortDir]);
  const pageData = filtered.slice((page - 1) * STOCK_PAGE_SIZE, page * STOCK_PAGE_SIZE);

  const handleSave = async (newQty) => {
    if (!modalItem) return;
    setSaving(true);
    try {
      await stockService.update(modalItem.id, { available_quantity: newQty, unit_cost: modalItem.unit_cost });
      setStockList(prev =>
        prev.map(s => s.id === modalItem.id
          ? { ...s, available_quantity: newQty, status: getStockStatus(newQty) }
          : s,
        ),
      );
      setModalItem(null);
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <PageSection>
      {showNovoProduto && (
        <NovoProdutoModal
          onClose={() => setShowNovoProduto(false)}
          onCreated={() => { setShowNovoProduto(false); load(); }}
        />
      )}

      {modalItem && (
        <AtualizarStockModal
          item={modalItem}
          onClose={() => setModalItem(null)}
          onSave={handleSave}
          saving={saving}
        />
      )}

      <div className="rounded-[32px] bg-surface p-6 shadow-sm">

        {/* ── Header ── */}
        <div className="mb-5 space-y-3">

          {/* Linha 1 — título + acções */}
          <div className="flex items-center justify-between gap-2">
            <div>
              <h2 className="text-xl sm:text-2xl font-bold" style={{ color: "var(--text)" }}>Stock</h2>
              <p className="mt-1 text-sm" style={{ color: "var(--text-secondary)" }}>Controlo de ingredientes e inventário.</p>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <button
                onClick={() => setShowNovoProduto(true)}
                className="flex items-center gap-1.5 rounded-xl px-3 sm:px-4 py-2 text-xs sm:text-sm font-semibold text-white whitespace-nowrap"
                style={{ background: "var(--primary)" }}
              >
                <i className="fa-solid fa-plus text-[10px] sm:text-xs" />
                Novo Produto
              </button>
            </div>
          </div>

          {/* Linha 2 — filtros estilo ClientesPage */}
          <div className="flex items-center gap-2">
            {showSearch && (
              <input autoFocus type="text" placeholder="Pesquisar produto…"
                value={search} onChange={e => setSearch(e.target.value)}
                className="flex-1 h-9 rounded-xl px-3 text-sm outline-none"
                style={{ background: "var(--surface-2)", border: "1px solid var(--border)", color: "var(--text)" }}
              />
            )}
            <div className="ml-auto flex items-center gap-2">
              <span className="hidden sm:inline-flex text-xs px-3 py-1 rounded-full border"
                style={{ color: "var(--text-muted)", borderColor: "var(--border)", background: "var(--surface-2)" }}>
                Filtro: Todos
              </span>
              <button onClick={() => { setShowSearch(s => !s); setSearch(""); }}
                className="w-8 h-8 rounded-lg border flex items-center justify-center cursor-pointer transition-colors"
                style={{ background: showSearch ? "var(--primary)" : "var(--surface)", borderColor: showSearch ? "var(--primary)" : "var(--border)", color: showSearch ? "#fff" : "var(--text-muted)" }}
                title={showSearch ? "Fechar pesquisa" : "Pesquisar"}>
                <i className={`fa-solid ${showSearch ? "fa-xmark" : "fa-magnifying-glass"} text-xs`} />
              </button>
            </div>
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
                    <th className="py-3 px-4 w-12" />
                    <SortTh col="name"   sortCol={sortCol} sortDir={sortDir} onSort={handleSort}>Produto</SortTh>
                    <SortTh col="qty"    sortCol={sortCol} sortDir={sortDir} onSort={handleSort}>Stock Atual</SortTh>
                    <SortTh col="unit"   sortCol={sortCol} sortDir={sortDir} onSort={handleSort}>Unidade</SortTh>
                    <SortTh col="status" sortCol={sortCol} sortDir={sortDir} onSort={handleSort}>Estado</SortTh>
                    <th className="py-3 px-4" />
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
                        onEdit={setModalItem} />
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
                    onEdit={setModalItem} />
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
