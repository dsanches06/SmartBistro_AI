import { useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { authService } from "@/services/authService";
import { TrophySpin } from "@/components/ui";
import { formatDate } from "@/components/customers/CustomerCard";

function EditProfileModal({ user, onClose, onSaved }) {
  const [name, setName] = useState(user.name || "");
  const [username, setUsername] = useState(user.username || "");
  const [email, setEmail] = useState(user.email || "");
  const [phone, setPhone] = useState(user.phone || "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!name.trim()) {
      setError("O nome é obrigatório.");
      return;
    }
    setError("");
    setLoading(true);
    try {
      onSaved({ name: name.trim(), username: username.trim() || null, email: email.trim() || null, phone: phone.trim() || null });
      onClose();
    } catch {
      setError("Não foi possível atualizar o perfil.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)" }} onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="w-full max-w-md rounded-2xl p-6 shadow-2xl" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-base font-bold" style={{ color: "var(--text)" }}>Editar perfil</h3>
          <button onClick={onClose} className="p-1.5 rounded-lg" style={{ color: "var(--text-muted)" }}>
            <i className="fa-solid fa-xmark" />
          </button>
        </div>
        <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
          {[
            { label: "Nome completo *", value: name, set: setName, type: "text", placeholder: "Nome" },
            { label: "Username", value: username, set: setUsername, type: "text", placeholder: "username" },
            { label: "E-mail", value: email, set: setEmail, type: "email", placeholder: "email" },
            { label: "Telefone", value: phone, set: setPhone, type: "tel", placeholder: "telefone" },
          ].map(({ label, value, set, type, placeholder }) => (
            <div key={label} className="flex flex-col gap-1">
              <label className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>{label}</label>
              <input
                type={type}
                value={value}
                onChange={(e) => set(e.target.value)}
                placeholder={placeholder}
                className="w-full h-10 rounded-lg px-3 text-sm outline-none"
                style={{ background: "var(--surface-2)", border: "1.5px solid var(--border)", color: "var(--text)" }}
              />
            </div>
          ))}
          {error && <p className="text-xs px-3 py-2 rounded-lg" style={{ background: "rgba(239,68,68,0.1)", color: "#ef4444" }}>{error}</p>}
          <div className="flex gap-2 pt-1">
            <button type="button" onClick={onClose} disabled={loading}
              className="flex-1 py-2 rounded-xl text-sm font-semibold"
              style={{ background: "var(--surface-2)", color: "var(--text-secondary)" }}>
              Cancelar
            </button>
            <button type="submit" disabled={loading}
              className="flex-1 py-2 rounded-xl text-sm font-bold text-white disabled:opacity-60"
              style={{ background: "var(--primary)" }}>
              {loading ? "A guardar..." : "Salvar alterações"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function DeleteRequestModal({ onClose, onConfirm, loading }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.6)" }}>
      <div className="w-full max-w-sm rounded-2xl p-6 shadow-2xl" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
        <h3 className="text-base font-bold mb-3" style={{ color: "var(--text)" }}>Solicitar remoção de conta</h3>
        <p className="text-sm mb-5" style={{ color: "var(--text-muted)" }}>
          O pedido será enviado ao administrador. A conta só será removida após aprovação.
        </p>
        <div className="flex gap-2 justify-end">
          <button onClick={onClose} disabled={loading}
            className="px-4 py-2 text-sm rounded-xl font-semibold"
            style={{ background: "var(--surface-2)", color: "var(--text-secondary)" }}>
            Cancelar
          </button>
          <button onClick={onConfirm} disabled={loading}
            className="px-4 py-2 text-sm rounded-xl font-semibold text-white disabled:opacity-60"
            style={{ background: "#ef4444" }}>
            {loading ? "Enviando..." : "Enviar pedido"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function CustomerProfilePage() {
  const { user, token, logout, updateUser } = useAuth();
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [deleteSuccess, setDeleteSuccess] = useState(false);
  const [error, setError] = useState("");

  if (!user) return null;

  const handleRequestDelete = async () => {
    setLoading(true);
    setError("");
    try {
      await authService.requestDelete(token);
      setDeleteSuccess(true);
      setShowDeleteModal(false);
    } catch (e) {
      setError(e?.message || "Erro ao enviar pedido de remoção.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen" style={{ background: "var(--bg)" }}>
      <div className="w-full max-w-[1000px] mx-auto px-4 sm:px-6 py-6 space-y-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] font-semibold" style={{ color: "var(--text-muted)" }}>Perfil de utilizador</p>
            <h1 className="text-2xl font-bold" style={{ color: "var(--text)" }}>Os teus dados</h1>
          </div>
          <div className="flex flex-wrap gap-2">
            <button onClick={() => setShowEditModal(true)}
              className="px-4 py-2 rounded-xl text-sm font-semibold text-white"
              style={{ background: "var(--primary)" }}>
              Editar dados
            </button>
            <button onClick={() => setShowDeleteModal(true)}
              className="px-4 py-2 rounded-xl text-sm font-semibold"
              style={{ background: "rgba(239,68,68,0.1)", color: "#ef4444", border: "1px solid rgba(239,68,68,0.3)" }}>
              Pedir remoção
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[360px_minmax(0,1fr)] gap-6">
          <div className="rounded-2xl p-5" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
            <p className="text-sm font-semibold mb-4" style={{ color: "var(--text)" }}>Informações da conta</p>
            <div className="space-y-3 text-sm">
              <div className="flex items-center justify-between">
                <span style={{ color: "var(--text-muted)" }}>Nome</span>
                <span style={{ color: "var(--text)" }}>{user.name}</span>
              </div>
              <div className="flex items-center justify-between">
                <span style={{ color: "var(--text-muted)" }}>Username</span>
                <span style={{ color: "var(--text)" }}>{user.username || "—"}</span>
              </div>
              <div className="flex items-center justify-between">
                <span style={{ color: "var(--text-muted)" }}>E-mail</span>
                <span style={{ color: "var(--text)" }}>{user.email || "—"}</span>
              </div>
              <div className="flex items-center justify-between">
                <span style={{ color: "var(--text-muted)" }}>Telefone</span>
                <span style={{ color: "var(--text)" }}>{user.phone || "—"}</span>
              </div>
              <div className="flex items-center justify-between">
                <span style={{ color: "var(--text-muted)" }}>Criado em</span>
                <span style={{ color: "var(--text)" }}>{formatDate(user.created_at)}</span>
              </div>
            </div>
          </div>

          <div className="rounded-2xl p-5" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
            <p className="text-sm font-semibold mb-4" style={{ color: "var(--text)" }}>Ações rápidas</p>
            <div className="grid gap-3">
              <button onClick={() => setShowEditModal(true)}
                className="w-full px-4 py-3 rounded-2xl text-sm font-semibold"
                style={{ background: "var(--primary)", color: "#fff" }}>
                Atualizar perfil
              </button>
              <button onClick={() => setShowDeleteModal(true)}
                className="w-full px-4 py-3 rounded-2xl text-sm font-semibold"
                style={{ background: "rgba(239,68,68,0.1)", color: "#ef4444" }}>
                Solicitar remoção da conta
              </button>
              <button onClick={() => logout()}
                className="w-full px-4 py-3 rounded-2xl text-sm font-semibold"
                style={{ background: "var(--surface-2)", color: "var(--text-secondary)" }}>
                Terminar sessão
              </button>
            </div>
            {deleteSuccess && (
              <p className="mt-4 text-sm" style={{ color: "#16a34a" }}>Pedido de remoção enviado com sucesso.</p>
            )}
            {error && (
              <p className="mt-4 text-sm" style={{ color: "#ef4444" }}>{error}</p>
            )}
          </div>
        </div>
      </div>

      {showEditModal && (
        <EditProfileModal user={user} onClose={() => setShowEditModal(false)} onSaved={(updated) => updateUser(updated)} />
      )}

      {showDeleteModal && (
        <DeleteRequestModal onClose={() => setShowDeleteModal(false)} onConfirm={handleRequestDelete} loading={loading} />
      )}
    </div>
  );
}
