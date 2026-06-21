import { useState } from "react";
import Modal from "./Modal.jsx";
import { authService } from "@/services/authService.js";

/* Passos:
   1 — username
   2 — sem phone: inserir número
   2b — OTP enviado: inserir código
   3 — nova password */

export default function ForgotPasswordModal({ open, onClose, isDark }) {
  const [step, setStep]           = useState(1);
  const [username, setUsername]   = useState("");
  const [phone, setPhone]         = useState("");
  const [otp, setOtp]             = useState("");
  const [newPass, setNewPass]     = useState("");
  const [confirmPass, setConfirmPass] = useState("");
  const [maskedPhone, setMaskedPhone] = useState("");
  const [demoCode, setDemoCode]   = useState("");
  const [loading, setLoading]     = useState(false);
  const [error, setError]         = useState("");
  const [success, setSuccess]     = useState(false);

  const reset = () => {
    setStep(1); setUsername(""); setPhone(""); setOtp("");
    setNewPass(""); setConfirmPass(""); setMaskedPhone("");
    setDemoCode(""); setError(""); setSuccess(false);
  };

  const handleClose = () => { reset(); onClose(); };

  /* Passo 1 — verificar username */
  const handleRequestCode = async (e) => {
    e.preventDefault();
    if (!username.trim()) return;
    setError(""); setLoading(true);
    try {
      const data = await authService.resetRequest(username.trim());
      if (data.needsPhone) {
        setStep(2);
      } else {
        setMaskedPhone(data.phone);
        setDemoCode(data.demoCode);
        setStep(3);
      }
    } catch (err) {
      setError(err.message);
    } finally { setLoading(false); }
  };

  /* Passo 2 — associar telefone */
  const handleAddPhone = async (e) => {
    e.preventDefault();
    if (!phone.trim()) return;
    setError(""); setLoading(true);
    try {
      const data = await authService.resetAddPhone(username.trim(), phone.trim());
      setMaskedPhone(data.phone);
      setDemoCode(data.demoCode);
      setStep(3);
    } catch (err) {
      setError(err.message);
    } finally { setLoading(false); }
  };

  /* Passo 3 — avançar com o código (verificação real no passo 4) */
  const handleVerifyOtp = (e) => {
    e.preventDefault();
    if (otp.length < 6) return;
    setError("");
    setStep(4);
  };

  /* Passo 4 — nova password */
  const handleSetPassword = async (e) => {
    e.preventDefault();
    if (newPass !== confirmPass) return setError("As palavras-passe não coincidem.");
    if (newPass.length < 6) return setError("Mínimo 6 caracteres.");
    setError(""); setLoading(true);
    try {
      await authService.resetConfirm(username.trim(), otp.trim(), newPass);
      setSuccess(true);
    } catch (err) {
      setError(err.message);
    } finally { setLoading(false); }
  };

  const inputCls = "w-full h-10 rounded-lg px-3 text-sm outline-none transition-all";
  const inputStyle = { background: "var(--surface-2)", border: "1.5px solid var(--border)", color: "var(--text)" };

  return (
    <Modal open={open} onClose={handleClose} title="Recuperar palavra-passe" isDark={isDark} size="xs">
      {success ? (
        <div className="flex flex-col items-center gap-4 py-2 text-center">
          <div className="w-14 h-14 rounded-full flex items-center justify-center" style={{ background: "rgba(34,197,94,0.12)" }}>
            <i className="fa-solid fa-circle-check text-3xl" style={{ color: "#22c55e" }} />
          </div>
          <p className="text-sm" style={{ color: "var(--text)" }}>
            Palavra-passe alterada com sucesso!<br />Já podes iniciar sessão.
          </p>
          <button onClick={handleClose}
            className="w-full py-2 rounded-xl text-sm font-semibold text-white"
            style={{ background: "var(--primary)" }}>
            Fechar
          </button>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {/* Indicador de passos */}
          <div className="flex items-center gap-1.5 justify-center">
            {[1,2,3,4].map(s => (
              <div key={s} className="h-1.5 rounded-full flex-1 transition-all"
                style={{ background: step >= s ? "var(--primary)" : "var(--border)" }} />
            ))}
          </div>

          {/* PASSO 1 — username */}
          {step === 1 && (
            <form className="flex flex-col gap-4" onSubmit={handleRequestCode}>
              <p className="text-xs" style={{ color: "var(--text-secondary)" }}>
                Insere o teu username para receber um código de verificação no teu telemóvel.
              </p>
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>Username</label>
                <input autoFocus value={username} onChange={e => setUsername(e.target.value)}
                  placeholder="o teu username" className={inputCls} style={inputStyle}
                  onFocus={e => e.target.style.borderColor = "var(--primary)"}
                  onBlur={e => e.target.style.borderColor = "var(--border)"} />
              </div>
              {error && <p className="text-xs px-3 py-2 rounded-lg" style={{ background: "rgba(239,68,68,0.1)", color: "#ef4444" }}>{error}</p>}
              <button type="submit" disabled={!username.trim() || loading}
                className="w-full py-2 rounded-xl text-sm font-semibold text-white disabled:opacity-50"
                style={{ background: "var(--primary)" }}>
                {loading ? "A verificar..." : "Continuar"}
              </button>
            </form>
          )}

          {/* PASSO 2 — sem telemóvel */}
          {step === 2 && (
            <form className="flex flex-col gap-4" onSubmit={handleAddPhone}>
              <p className="text-xs" style={{ color: "var(--text-secondary)" }}>
                A tua conta não tem um número de telemóvel associado. Insere um número para receber o código.
              </p>
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>Telemóvel</label>
                <input autoFocus value={phone} onChange={e => setPhone(e.target.value)}
                  placeholder="+351 9XX XXX XXX" type="tel" className={inputCls} style={inputStyle}
                  onFocus={e => e.target.style.borderColor = "var(--primary)"}
                  onBlur={e => e.target.style.borderColor = "var(--border)"} />
              </div>
              {error && <p className="text-xs px-3 py-2 rounded-lg" style={{ background: "rgba(239,68,68,0.1)", color: "#ef4444" }}>{error}</p>}
              <div className="flex gap-2">
                <button type="button" onClick={() => { setStep(1); setError(""); }}
                  className="flex-1 py-2 rounded-xl text-sm font-semibold"
                  style={{ background: "var(--surface-2)", color: "var(--text-secondary)" }}>
                  Voltar
                </button>
                <button type="submit" disabled={!phone.trim() || loading}
                  className="flex-1 py-2 rounded-xl text-sm font-semibold text-white disabled:opacity-50"
                  style={{ background: "var(--primary)" }}>
                  {loading ? "A enviar..." : "Enviar código"}
                </button>
              </div>
            </form>
          )}

          {/* PASSO 3 — código OTP */}
          {step === 3 && (
            <form className="flex flex-col gap-4" onSubmit={handleVerifyOtp}>
              <p className="text-xs" style={{ color: "var(--text-secondary)" }}>
                Enviámos um código para <strong style={{ color: "var(--text)" }}>{maskedPhone}</strong>.
              </p>
              {demoCode && (
                <div className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs"
                  style={{ background: "rgba(99,102,241,0.1)", border: "1px solid var(--primary)", color: "var(--text-secondary)" }}>
                  <i className="fa-solid fa-flask" style={{ color: "var(--primary)" }} />
                  <span>Demo — código: <strong style={{ color: "var(--primary)", letterSpacing: 2 }}>{demoCode}</strong></span>
                </div>
              )}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>Código de verificação</label>
                <input autoFocus value={otp} onChange={e => setOtp(e.target.value.replace(/\D/g, '').slice(0,6))}
                  placeholder="000000" maxLength={6} className={inputCls}
                  style={{ ...inputStyle, letterSpacing: 4, textAlign: "center", fontSize: "1.25rem", fontWeight: 700 }}
                  onFocus={e => e.target.style.borderColor = "var(--primary)"}
                  onBlur={e => e.target.style.borderColor = "var(--border)"} />
              </div>
              {error && <p className="text-xs px-3 py-2 rounded-lg" style={{ background: "rgba(239,68,68,0.1)", color: "#ef4444" }}>{error}</p>}
              <button type="submit" disabled={otp.length < 6 || loading}
                className="w-full py-2 rounded-xl text-sm font-semibold text-white disabled:opacity-50"
                style={{ background: "var(--primary)" }}>
                {loading ? "A verificar..." : "Verificar código"}
              </button>
            </form>
          )}

          {/* PASSO 4 — nova password */}
          {step === 4 && (
            <form className="flex flex-col gap-4" onSubmit={handleSetPassword}>
              <p className="text-xs" style={{ color: "var(--text-secondary)" }}>
                Código verificado! Define a tua nova palavra-passe.
              </p>
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>Nova palavra-passe</label>
                <input autoFocus type="password" value={newPass} onChange={e => setNewPass(e.target.value)}
                  placeholder="mínimo 6 caracteres" className={inputCls} style={inputStyle}
                  onFocus={e => e.target.style.borderColor = "var(--primary)"}
                  onBlur={e => e.target.style.borderColor = "var(--border)"} />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>Confirmar palavra-passe</label>
                <input type="password" value={confirmPass} onChange={e => setConfirmPass(e.target.value)}
                  placeholder="repetir password" className={inputCls} style={inputStyle}
                  onFocus={e => e.target.style.borderColor = "var(--primary)"}
                  onBlur={e => e.target.style.borderColor = "var(--border)"} />
              </div>
              {error && <p className="text-xs px-3 py-2 rounded-lg" style={{ background: "rgba(239,68,68,0.1)", color: "#ef4444" }}>{error}</p>}
              <button type="submit" disabled={!newPass || !confirmPass || loading}
                className="w-full py-2 rounded-xl text-sm font-semibold text-white disabled:opacity-50"
                style={{ background: "var(--primary)" }}>
                {loading ? "A guardar..." : "Definir palavra-passe"}
              </button>
            </form>
          )}
        </div>
      )}
    </Modal>
  );
}
