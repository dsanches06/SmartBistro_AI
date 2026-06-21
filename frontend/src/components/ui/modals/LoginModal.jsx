import { useState } from "react";
import Modal from "./Modal.jsx";

function Field({ label, type = "text", value, onChange, placeholder, autoFocus }) {
  const [show, setShow] = useState(false);
  const isPassword = type === "password";
  const inputType = isPassword ? (show ? "text" : "password") : type;

  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>
        {label}
      </label>
      <div className="relative">
        <input
          type={inputType}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          autoFocus={autoFocus}
          className="w-full h-10 rounded-lg px-3 text-sm outline-none transition-all"
          style={{
            background: "var(--surface-2)",
            border: "1.5px solid var(--border)",
            color: "var(--text)",
            paddingRight: isPassword ? "2.75rem" : undefined,
          }}
          onFocus={(e) => (e.target.style.borderColor = "var(--primary)")}
          onBlur={(e) => (e.target.style.borderColor = "var(--border)")}
        />
        {isPassword && (
          <button
            type="button"
            onClick={() => setShow((s) => !s)}
            className="absolute right-3 top-1/2 -translate-y-1/2"
            style={{ color: "var(--text-muted)" }}
            tabIndex={-1}
            aria-label={show ? "Ocultar password" : "Mostrar password"}
          >
            {show ? (
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
                <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
                <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
                <line x1="1" y1="1" x2="23" y2="23" />
              </svg>
            ) : (
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                <circle cx="12" cy="12" r="3" />
              </svg>
            )}
          </button>
        )}
      </div>
    </div>
  );
}

function ErrorMsg({ msg }) {
  if (!msg) return null;
  return (
    <p className="text-xs px-3 py-2 rounded-lg" style={{ background: "rgba(239,68,68,0.1)", color: "#ef4444" }}>
      {msg}
    </p>
  );
}

export default function LoginModal({ open, onClose, onSwitchToRegister, onForgotPassword, isDark, onLogin, sessionBlocked, sessionMessage }) {
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const canSubmit = identifier.trim().length > 0 && password.length > 0;

  const handleClose = () => {
    setIdentifier("");
    setPassword("");
    setError("");
    onClose();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!canSubmit) return;
    setError("");
    setLoading(true);
    try {
      await onLogin(identifier, password);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal open={open} onClose={handleClose} title="Entrar na conta" isDark={isDark} size="xs">
      <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
        {sessionBlocked && sessionMessage ? <ErrorMsg msg={sessionMessage} /> : null}
        <Field label="E-mail ou username" value={identifier} onChange={setIdentifier} placeholder="email ou username" autoFocus />
        <Field label="Palavra-passe" type="password" value={password} onChange={setPassword} placeholder="••••••••" />
        {onForgotPassword && (
          <div className="flex justify-end -mt-2">
            <button type="button" onClick={() => { handleClose(); onForgotPassword(); }}
              className="text-xs underline underline-offset-2"
              style={{ color: "var(--text-muted)" }}>
              Esqueceste a palavra-passe?
            </button>
          </div>
        )}
        <ErrorMsg msg={error} />

        <button
          type="submit"
          disabled={!canSubmit || loading || sessionBlocked}
          className="w-full py-2 rounded-xl text-sm font-semibold transition-all"
          style={{
            background: canSubmit ? "var(--primary)" : "transparent",
            color: canSubmit ? "#fff" : "var(--text-muted)",
            border: canSubmit ? "1.5px solid var(--primary)" : "1.5px solid var(--border)",
            cursor: canSubmit ? "pointer" : "not-allowed",
          }}
        >
          {loading ? "A entrar..." : "Entrar"}
        </button>

        <p className="text-center text-xs" style={{ color: "var(--text-muted)" }}>
          Não tens conta?{' '}
          <button
            type="button"
            className="font-semibold underline underline-offset-2"
            style={{ color: "var(--primary)" }}
            onClick={() => {
              handleClose();
              onSwitchToRegister();
            }}
          >
            Registar
          </button>
        </p>
      </form>
    </Modal>
  );
}
