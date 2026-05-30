import { useCallback, useEffect, useRef, useState } from "react";
import { PageSection, Pagination, ListCard } from "@/components";
import { itemService } from "@/services";
import { MENU_CATEGORIES, MENU_CATEGORY_META, formatMenuPrice, getItemEmoji } from "@/utils";

const MENU_PAGE_SIZE = 10;

/* ── PriceEditor (gestão inline) ── */
function PriceEditor({ item, onSave, onCancel, saving }) {
  const [val, setVal] = useState(String(item.price));
  const ref = useRef(null);
  useEffect(() => { ref.current?.focus(); ref.current?.select(); }, []);
  const confirm = () => {
    const n = parseFloat(val.replace(",", "."));
    if (!isNaN(n) && n > 0) onSave(n);
  };
  return (
    <div className="flex items-center gap-1.5">
      <input
        ref={ref} type="number" min="0.01" step="0.01"
        value={val}
        onChange={e => setVal(e.target.value)}
        onKeyDown={e => { if (e.key === "Enter") confirm(); if (e.key === "Escape") onCancel(); }}
        className="w-20 rounded-lg px-2 py-1 text-sm font-semibold text-right outline-none"
        style={{ border: "1.5px solid var(--primary)", background: "var(--surface)", color: "var(--text)" }}
      />
      <button onClick={confirm} disabled={saving}
        className="w-7 h-7 inline-flex items-center justify-center rounded-lg disabled:opacity-50"
        style={{ background: "#22c55e", color: "#fff" }}>
        {saving ? <i className="fa-solid fa-spinner fa-spin text-xs" /> : <i className="fa-solid fa-check text-xs" />}
      </button>
      <button onClick={onCancel} disabled={saving}
        className="w-7 h-7 inline-flex items-center justify-center rounded-lg disabled:opacity-50"
        style={{ background: "var(--surface-2)", color: "var(--text-secondary)" }}>
        <i className="fa-solid fa-xmark text-xs" />
      </button>
    </div>
  );
}

/* ── GestãoRow ── */
function GestaoRow({ item, editingId, savingId, togglingId, onEdit, onSave, onCancel, onToggle }) {
  const meta       = MENU_CATEGORY_META[item.category] ?? {};
  const isEditing  = editingId  === item.id;
  const isSaving   = savingId   === item.id;
  const isToggling = togglingId === item.id;
  return (
    <tr
      className="border-b border-[var(--border)] transition-colors"
      style={{ opacity: item.is_active ? 1 : 0.6 }}
      onMouseEnter={e => { e.currentTarget.style.background = "var(--surface-2)"; }}
      onMouseLeave={e => { e.currentTarget.style.background = ""; }}
    >
      <td className="py-3 px-4">
        <div className="flex items-center gap-2">
          <span style={{ fontSize: 18 }}>{getItemEmoji(item.name)}</span>
          <span className="text-sm font-semibold" style={{ color: "var(--text)" }}>{item.name}</span>
        </div>
      </td>
      <td className="py-3 px-4">
        <span className="text-xs font-semibold px-2 py-0.5 rounded-full"
          style={{ background: `${meta.accent}18`, color: meta.accent }}>
          {meta.emoji} {meta.label}
        </span>
      </td>
      <td className="py-3 px-4">
        {isEditing
          ? <PriceEditor item={item} onSave={onSave} onCancel={onCancel} saving={isSaving} />
          : <span className="text-sm font-bold" style={{ color: meta.accent }}>{formatMenuPrice(item.price)}</span>
        }
      </td>
      <td className="py-3 px-4">
        <span className="text-xs font-semibold px-2 py-0.5 rounded-full"
          style={{ background: item.is_active ? "#f0fdf4" : "#fef2f2", color: item.is_active ? "#166534" : "#991b1b" }}>
          {item.is_active ? "Ativo" : "Inativo"}
        </span>
      </td>
      <td className="py-3 px-4">
        <div className="flex items-center gap-2">
          {!isEditing && (
            <button onClick={() => onEdit(item)}
              className="text-xs px-2.5 py-1.5 rounded-lg border transition-colors"
              style={{ color: "var(--primary)", borderColor: "var(--border)", background: "var(--surface-2)" }}
              onMouseEnter={e => { e.currentTarget.style.background = "var(--primary)"; e.currentTarget.style.color = "#fff"; }}
              onMouseLeave={e => { e.currentTarget.style.background = "var(--surface-2)"; e.currentTarget.style.color = "var(--primary)"; }}
            >
              <i className="fa-solid fa-pen text-xs mr-1" />Preço
            </button>
          )}
          <button onClick={() => onToggle(item)} disabled={isToggling}
            className="text-xs px-2.5 py-1.5 rounded-lg border transition-colors disabled:opacity-50"
            style={{
              color:       item.is_active ? "#991b1b" : "#166534",
              borderColor: item.is_active ? "#fecaca" : "#bbf7d0",
              background:  item.is_active ? "#fef2f2" : "#f0fdf4",
            }}
          >
            {isToggling
              ? <i className="fa-solid fa-spinner fa-spin text-xs" />
              : item.is_active ? "Desativar" : "Ativar"}
          </button>
        </div>
      </td>
    </tr>
  );
}

/* ── GestaoCard (mobile) ── */
function GestaoCard({ item, editingId, savingId, togglingId, onEdit, onSave, onCancel, onToggle }) {
  const meta       = MENU_CATEGORY_META[item.category] ?? {};
  const isEditing  = editingId  === item.id;
  const isSaving   = savingId   === item.id;
  const isToggling = togglingId === item.id;
  return (
    <ListCard style={{ opacity: item.is_active ? 1 : 0.7 }}>
      {/* Nome + emoji */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <span style={{ fontSize: 20, flexShrink: 0 }}>{getItemEmoji(item.name)}</span>
          <span className="text-sm font-semibold truncate" style={{ color: "var(--text)" }}>{item.name}</span>
        </div>
        <span className="text-xs font-semibold px-2 py-0.5 rounded-full flex-shrink-0"
          style={{ background: item.is_active ? "#f0fdf4" : "#fef2f2", color: item.is_active ? "#166534" : "#991b1b" }}>
          {item.is_active ? "Ativo" : "Inativo"}
        </span>
      </div>
      {/* Categoria + preço */}
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold px-2 py-0.5 rounded-full"
          style={{ background: `${meta.accent}18`, color: meta.accent }}>
          {meta.emoji} {meta.label}
        </span>
        {isEditing
          ? <PriceEditor item={item} onSave={onSave} onCancel={onCancel} saving={isSaving} />
          : <span className="text-base font-bold" style={{ color: meta.accent }}>{formatMenuPrice(item.price)}</span>
        }
      </div>
      {/* Ações */}
      {!isEditing && (
        <div className="flex gap-2 pt-0.5">
          <button onClick={() => onEdit(item)}
            className="flex-1 text-xs py-1.5 rounded-lg border font-semibold transition-colors"
            style={{ color: "var(--primary)", borderColor: "var(--border)", background: "var(--surface-2)" }}
            onMouseEnter={e => { e.currentTarget.style.background = "var(--primary)"; e.currentTarget.style.color = "#fff"; }}
            onMouseLeave={e => { e.currentTarget.style.background = "var(--surface-2)"; e.currentTarget.style.color = "var(--primary)"; }}>
            <i className="fa-solid fa-pen text-xs mr-1" />Editar Preço
          </button>
          <button onClick={() => onToggle(item)} disabled={isToggling}
            className="flex-1 text-xs py-1.5 rounded-lg border font-semibold transition-colors disabled:opacity-50"
            style={{
              color:       item.is_active ? "#991b1b" : "#166534",
              borderColor: item.is_active ? "#fecaca" : "#bbf7d0",
              background:  item.is_active ? "#fef2f2" : "#f0fdf4",
            }}>
            {isToggling ? <i className="fa-solid fa-spinner fa-spin text-xs" /> : item.is_active ? "Desativar" : "Ativar"}
          </button>
        </div>
      )}
    </ListCard>
  );
}

/* ── CreateItemModal ── */
function CreateItemModal({ onClose, onCreate }) {
  const [form,   setForm]   = useState({ name: "", category: "Main Course", price: "" });
  const [saving, setSaving] = useState(false);
  const [err,    setErr]    = useState("");

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    const price = parseFloat(form.price.replace(",", "."));
    if (!form.name.trim())      return setErr("Nome obrigatório.");
    if (isNaN(price) || price <= 0) return setErr("Preço inválido.");
    setSaving(true);
    setErr("");
    try {
      const created = await itemService.create({ name: form.name.trim(), category: form.category, price });
      onCreate(created);
      onClose();
    } catch (e) {
      setErr("Erro ao criar item. Tente novamente.");
      console.error(e);
    } finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.5)" }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="rounded-[24px] p-6 w-full max-w-sm shadow-2xl"
        style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-bold" style={{ color: "var(--text)" }}>Novo Item</h2>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-xl"
            style={{ background: "var(--surface-2)", color: "var(--text-muted)" }}>
            <i className="fa-solid fa-xmark text-sm" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <label className="block text-xs font-semibold mb-1" style={{ color: "var(--text-secondary)" }}>Nome</label>
            <input type="text" value={form.name} onChange={e => set("name", e.target.value)}
              placeholder="Ex: Frango Grelhado"
              className="w-full rounded-xl px-3 py-2 text-sm outline-none"
              style={{ background: "var(--surface-2)", border: "1px solid var(--border)", color: "var(--text)" }} />
          </div>
          <div>
            <label className="block text-xs font-semibold mb-1" style={{ color: "var(--text-secondary)" }}>Categoria</label>
            <select value={form.category} onChange={e => set("category", e.target.value)}
              className="w-full rounded-xl px-3 py-2 text-sm outline-none"
              style={{ background: "var(--surface-2)", border: "1px solid var(--border)", color: "var(--text)" }}>
              {MENU_CATEGORIES.map(c => (
                <option key={c.key} value={c.key}>{c.emoji} {c.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold mb-1" style={{ color: "var(--text-secondary)" }}>Preço (€)</label>
            <input type="number" min="0.01" step="0.01" value={form.price}
              onChange={e => set("price", e.target.value)}
              placeholder="0.00"
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
              {saving ? <i className="fa-solid fa-spinner fa-spin" /> : "Criar Item"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* ── MenuPage ── */
export default function MenuPage() {
  const [items,      setItems]      = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [error,      setError]      = useState(null);
  const [catFilter,  setCatFilter]  = useState("all");
  const [search,     setSearch]     = useState("");
  const [page,       setPage]       = useState(1);
  const [editingId,  setEditingId]  = useState(null);
  const [savingId,   setSavingId]   = useState(null);
  const [togglingId, setTogglingId] = useState(null);
  const [showCreate, setShowCreate] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await itemService.getAll();
      setItems(Array.isArray(res) ? res : []);
    } catch (err) {
      console.error(err);
      setError("Não foi possível carregar o menu.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = items.filter(i => {
    const matchCat    = catFilter === "all" || i.category === catFilter;
    const matchSearch = !search.trim() || i.name.toLowerCase().includes(search.trim().toLowerCase());
    return matchCat && matchSearch;
  });

  const pageData = filtered.slice((page - 1) * MENU_PAGE_SIZE, page * MENU_PAGE_SIZE);

  const handleCatFilter = (cat) => { setCatFilter(cat); setPage(1); };
  const handleSearch    = (v)   => { setSearch(v);     setPage(1); };

  const handleEdit      = item => setEditingId(item.id);
  const handleCancel    = ()   => setEditingId(null);

  const handleSavePrice = async (newPrice) => {
    const item = items.find(i => i.id === editingId);
    if (!item) return;
    setSavingId(editingId);
    try {
      await itemService.update(item.id, { name: item.name, category: item.category, price: newPrice });
      setItems(prev => prev.map(i => i.id === item.id ? { ...i, price: newPrice } : i));
      setEditingId(null);
    } catch (err) { console.error(err); }
    finally { setSavingId(null); }
  };

  const handleToggle = async (item) => {
    setTogglingId(item.id);
    try {
      await itemService.toggleActive(item.id, !item.is_active);
      setItems(prev => prev.map(i => i.id === item.id ? { ...i, is_active: !i.is_active } : i));
    } catch (err) { console.error(err); }
    finally { setTogglingId(null); }
  };

  const handleCreated = (newItem) => {
    setItems(prev => [...prev, { ...newItem, is_active: newItem.is_active ?? true }]);
  };

  return (
    <PageSection>
      {showCreate && (
        <CreateItemModal onClose={() => setShowCreate(false)} onCreate={handleCreated} />
      )}
      <div className="rounded-[32px] bg-surface p-6 shadow-sm">

        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <h1 className="text-2xl font-bold" style={{ color: "var(--text)" }}>Menu</h1>
          <div className="flex items-center gap-2">
            <button onClick={load} title="Atualizar"
              className="w-9 h-9 inline-flex items-center justify-center rounded-xl border border-[var(--border)] transition-colors"
              style={{ color: "var(--text-secondary)", background: "var(--surface-2)" }}>
              <i className={`fa-solid fa-rotate-right text-sm${loading ? " fa-spin" : ""}`} />
            </button>
            <button onClick={() => setShowCreate(true)}
              className="flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold text-white hover:opacity-90 transition-opacity"
              style={{ background: "var(--primary)" }}>
              <i className="fa-solid fa-plus text-xs" />
              Novo Item
            </button>
          </div>
        </div>

        {/* Search */}
        <div className="flex items-center gap-2 rounded-xl px-3 py-2 mb-3"
          style={{ background: "var(--surface-2)", border: "1px solid var(--border)" }}>
          <i className="fa-solid fa-magnifying-glass text-sm" style={{ color: "var(--text-muted)" }} />
          <input type="text" placeholder="Pesquisar item…" value={search}
            onChange={e => handleSearch(e.target.value)}
            className="flex-1 bg-transparent text-sm outline-none" style={{ color: "var(--text)" }} />
          {search && (
            <button onClick={() => handleSearch("")} style={{ color: "var(--text-muted)" }}>
              <i className="fa-solid fa-xmark text-xs" />
            </button>
          )}
        </div>

        {/* Category filters — scroll horizontal no mobile */}
        <div className="flex gap-1.5 mb-5 overflow-x-auto pb-0.5" style={{ scrollbarWidth: "none" }}>
          <button onClick={() => handleCatFilter("all")}
            className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex-shrink-0 whitespace-nowrap"
            style={{ background: catFilter === "all" ? "var(--primary)" : "var(--surface-2)", color: catFilter === "all" ? "#fff" : "var(--text-secondary)" }}>
            Todos
          </button>
          {MENU_CATEGORIES.map(cat => (
            <button key={cat.key} onClick={() => handleCatFilter(cat.key)}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex-shrink-0 whitespace-nowrap"
              style={{ background: catFilter === cat.key ? cat.accent : "var(--surface-2)", color: catFilter === cat.key ? "#fff" : "var(--text-secondary)" }}>
              {cat.emoji} {cat.label}
            </button>
          ))}
        </div>



        {/* Content */}
        {loading ? (
          <div className="rounded-2xl p-10 text-center text-sm" style={{ background: "var(--surface-2)", color: "var(--text-secondary)" }}>
            <i className="fa-solid fa-spinner fa-spin mr-2" />A carregar menu…
          </div>
        ) : error ? (
          <div className="rounded-2xl p-8 text-center text-sm" style={{ background: "#fef2f2", color: "#991b1b" }}>
            {error} <button onClick={load} className="ml-2 underline font-semibold">Tentar novamente</button>
          </div>
        ) : (
          <>
            {/* Desktop table */}
            <div className="hidden md:block overflow-x-auto rounded-2xl" style={{ border: "1px solid var(--border)" }}>
              <table className="w-full text-left">
                <thead>
                  <tr style={{ borderBottom: "1px solid var(--border)", background: "var(--surface-2)" }}>
                    {["Item", "Categoria", "Preço", "Estado", "Ações"].map(h => (
                      <th key={h} className="py-3 px-4 text-xs font-semibold uppercase tracking-wider"
                        style={{ color: "var(--text-secondary)" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {pageData.length === 0
                    ? <tr><td colSpan={5} className="py-10 text-center text-sm" style={{ color: "var(--text-muted)" }}>Nenhum item encontrado.</td></tr>
                    : pageData.map(item => (
                      <GestaoRow key={item.id} item={item}
                        editingId={editingId} savingId={savingId} togglingId={togglingId}
                        onEdit={handleEdit} onSave={handleSavePrice} onCancel={handleCancel} onToggle={handleToggle}
                      />
                    ))
                  }
                </tbody>
              </table>
            </div>

            {/* Mobile cards */}
            <div className="md:hidden flex flex-col gap-2.5">
              {pageData.length === 0
                ? <p className="py-10 text-center text-sm" style={{ color: "var(--text-muted)" }}>Nenhum item encontrado.</p>
                : pageData.map(item => (
                  <GestaoCard key={item.id} item={item}
                    editingId={editingId} savingId={savingId} togglingId={togglingId}
                    onEdit={handleEdit} onSave={handleSavePrice} onCancel={handleCancel} onToggle={handleToggle}
                  />
                ))
              }
            </div>

            {/* Footer */}
            <div className="flex flex-wrap items-center justify-between gap-3 mt-4">
              <span className="text-sm" style={{ color: "var(--text-secondary)" }}>
                Total: <strong>{filtered.length}</strong> item{filtered.length !== 1 ? "s" : ""}
              </span>
              <Pagination page={page} total={filtered.length} pageSize={MENU_PAGE_SIZE} onChange={setPage} />
            </div>
          </>
        )}

      </div>
    </PageSection>
  );
}
