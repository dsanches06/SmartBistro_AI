import { useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { authService } from "@/services/authService";

function EditDataModal({ user, onClose, onSaved }) {
  const [name, setName] = useState(user.name || "");
  const [username, setUsername] = useState(user.username || "");
  const [email, setEmail] = useState(user.email || "");
  const [phone, setPhone] = useState(user.phone || "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    const nameLen = name.trim().length;
    const usernameLen = username.trim().length;
    if (nameLen < 3 || nameLen > 20) { setError("O nome deve ter entre 3 e 20 caracteres."); return; }
    if (usernameLen > 0 && (usernameLen < 3 || usernameLen > 20)) { setError("O username deve ter entre 3 e 20 caracteres."); return; }
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

  const fields = [
    { label: "Nome completo *", value: name, set: setName, type: "text", placeholder: "Nome", maxLength: 20 },
    { label: "Username", value: username, set: setUsername, type: "text", placeholder: "username", maxLength: 20 },
    { label: "E-mail", value: email, set: setEmail, type: "email", placeholder: "email" },
    { label: "Telefone", value: phone, set: setPhone, type: "tel", placeholder: "telefone" },
  ];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)" }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="w-full max-w-md rounded-2xl p-6 shadow-2xl" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-base font-bold" style={{ color: "var(--text)" }}>Editar dados</h3>
          <button onClick={onClose} className="p-1.5 rounded-lg" style={{ color: "var(--text-muted)" }}>
            <i className="fa-solid fa-xmark" />
          </button>
        </div>
        <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
          {fields.map(({ label, value, set, type, placeholder, maxLength }) => (
            <div key={label} className="flex flex-col gap-1">
              <label className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: "var(--primary)" }}>{label}</label>
              <input
                type={type}
                value={value}
                onChange={(e) => set(e.target.value)}
                placeholder={placeholder}
                maxLength={maxLength}
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
              {loading ? "A guardar..." : "Salvar"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function PasswordInput({ label, value, onChange }) {
  const [show, setShow] = useState(false);
  return (
    <div className="flex flex-col gap-1">
      <label className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: "var(--primary)" }}>{label}</label>
      <div className="relative">
        <input
          type={show ? "text" : "password"}
          value={value}
          onChange={onChange}
          className="w-full h-10 rounded-lg px-3 pr-10 text-sm outline-none"
          style={{ background: "var(--surface-2)", border: "1.5px solid var(--border)", color: "var(--text)" }}
        />
        <button
          type="button"
          onClick={() => setShow((s) => !s)}
          className="absolute right-2.5 top-1/2 -translate-y-1/2"
          style={{ color: "var(--text-muted)" }}
        >
          <i className={`fa-solid ${show ? "fa-eye" : "fa-eye-slash"} text-sm`} />
        </button>
      </div>
    </div>
  );
}

function ChangePasswordModal({ token, onClose }) {
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!current || !next || !confirm) { setError("Preenche todos os campos."); return; }
    if (next !== confirm) { setError("As passwords não coincidem."); return; }
    if (next.length < 6) { setError("A nova password deve ter pelo menos 6 caracteres."); return; }
    setError("");
    setLoading(true);
    try {
      await authService.changePassword(token, current, next);
      setSuccess(true);
    } catch (e) {
      setError(e?.message || "Erro ao alterar password.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)" }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="w-full max-w-sm rounded-2xl p-6 shadow-2xl" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-base font-bold" style={{ color: "var(--text)" }}>Alterar password</h3>
          <button onClick={onClose} className="p-1.5 rounded-lg" style={{ color: "var(--text-muted)" }}>
            <i className="fa-solid fa-xmark" />
          </button>
        </div>

        {success ? (
          <div className="text-center py-4">
            <i className="fa-solid fa-circle-check text-3xl mb-3" style={{ color: "#16a34a" }} />
            <p className="text-sm font-semibold mb-4" style={{ color: "var(--text)" }}>Password alterada com sucesso!</p>
            <button onClick={onClose} className="px-6 py-2 rounded-xl text-sm font-semibold text-white" style={{ background: "var(--primary)" }}>
              Fechar
            </button>
          </div>
        ) : (
          <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
            <PasswordInput label="Password atual" value={current} onChange={(e) => setCurrent(e.target.value)} />
            <PasswordInput label="Nova password" value={next} onChange={(e) => setNext(e.target.value)} />
            <PasswordInput label="Confirmar nova password" value={confirm} onChange={(e) => setConfirm(e.target.value)} />
            {error && <p className="text-xs px-3 py-2 rounded-lg" style={{ background: "rgba(239,68,68,0.1)", color: "#ef4444" }}>{error}</p>}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 rounded-xl text-sm font-bold text-white disabled:opacity-60"
              style={{ background: "var(--primary)" }}
            >
              {loading ? "A alterar..." : "Alterar password"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

function DeleteRequestModal({ onClose, onConfirm, loading }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)" }}>
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

function SectionCard({ title, onEdit, children }) {
  return (
    <div className="rounded-2xl p-5" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
      <div className="flex items-center justify-between mb-4">
        <p className="text-[11px] font-bold uppercase tracking-[0.15em]" style={{ color: "var(--text-muted)" }}>{title}</p>
        {onEdit && (
          <button
            onClick={onEdit}
            className="p-1.5 rounded-lg transition-colors"
            style={{ color: "var(--text-muted)" }}
            onMouseEnter={(e) => e.currentTarget.style.color = "var(--text)"}
            onMouseLeave={(e) => e.currentTarget.style.color = "var(--text-muted)"}
          >
            <i className="fa-solid fa-pencil text-xs" />
          </button>
        )}
      </div>
      {children}
    </div>
  );
}

function DataField({ label, value }) {
  return (
    <div>
      <p className="text-[10px] font-bold uppercase tracking-wider mb-1" style={{ color: "var(--primary)" }}>{label}</p>
      <p className="text-sm font-medium" style={{ color: "var(--text)" }}>{value || "—"}</p>
    </div>
  );
}

export default function CustomerProfilePage() {
  const { user, token, updateUser } = useAuth();
  const [showEditModal, setShowEditModal] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
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

        <h2 className="text-2xl font-bold" style={{ color: "var(--text)" }}>Meu Perfil</h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-start">
          <SectionCard title="Meus dados" onEdit={() => setShowEditModal(true)}>
            <div className="grid grid-cols-2 gap-x-6 gap-y-4">
              <DataField label="Nome" value={user.name} />
              <DataField label="Username" value={user.username} />
              {(user.email || user.phone) && (
                <>
                  <DataField label="E-mail" value={user.email} />
                  <DataField label="Telefone" value={user.phone} />
                </>
              )}
            </div>
          </SectionCard>

          <div className="flex flex-col gap-4">
            <SectionCard title="Password" onEdit={() => setShowPasswordModal(true)}>
              <p className="text-sm tracking-widest" style={{ color: "var(--text-muted)" }}>••••••••</p>
            </SectionCard>

            <button
              onClick={() => setShowDeleteModal(true)}
              className="w-full py-2.5 rounded-xl text-sm font-semibold"
              style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)", color: "#ef4444" }}
            >
              Solicitar remoção da conta
            </button>
          </div>
        </div>

        {deleteSuccess && (
          <p className="text-sm text-center" style={{ color: "#16a34a" }}>Pedido de remoção enviado com sucesso.</p>
        )}
        {error && (
          <p className="text-sm text-center" style={{ color: "#ef4444" }}>{error}</p>
        )}
      </div>

      {showEditModal && (
        <EditDataModal user={user} onClose={() => setShowEditModal(false)} onSaved={(updated) => updateUser(updated)} />
      )}

      {showPasswordModal && (
        <ChangePasswordModal token={token} onClose={() => setShowPasswordModal(false)} />
      )}

      {showDeleteModal && (
        <DeleteRequestModal onClose={() => setShowDeleteModal(false)} onConfirm={handleRequestDelete} loading={loading} />
      )}
    </div>
  );
}
