import { useRef, useState } from "react";
import { transcribeAudio } from "@/services/voiceService.js";

// Área de entrada do chat: texto + envio + microfone (Whisper V3 via Groq).
export function ChatInputUI({ value, onChange, onSubmit, onVoiceSend, disabled = false, inputRef }) {
  const [recording, setRecording]       = useState(false);
  const [transcribing, setTranscribing] = useState(false);
  const mediaRef  = useRef(null);
  const chunksRef = useRef([]);

  const handleKeyPress = (e) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); onSubmit(e); }
  };

  const startRecording = async () => {
    try {
      const stream   = await navigator.mediaDevices.getUserMedia({ audio: true });
      chunksRef.current = [];
      const recorder = new MediaRecorder(stream);
      recorder.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data); };
      recorder.start();
      mediaRef.current = recorder;
      setRecording(true);
    } catch { /* sem permissão */ }
  };

  const stopAndTranscribe = async (autoSend = false) => {
    const recorder = mediaRef.current;
    if (!recorder) return;
    setRecording(false);

    await new Promise((resolve) => {
      recorder.onstop = () => {
        recorder.stream.getTracks().forEach(t => t.stop());
        resolve();
      };
      recorder.requestData(); // força flush de todos os dados pendentes
      recorder.stop();
    });

    setTranscribing(true);
    try {
      const mimeType = recorder.mimeType || 'audio/webm';
      const blob = new Blob(chunksRef.current, { type: mimeType });
      const text = await transcribeAudio(blob, mimeType);
      if (!text) return;
      if (autoSend && onVoiceSend) {
        onVoiceSend(text);           // envia directamente ao chatbot
      } else {
        onChange({ target: { value: (value ? value + ' ' : '') + text } });
      }
    } catch { /* erro silencioso */ }
    finally { setTranscribing(false); }
  };

  return (
    <form onSubmit={onSubmit} className="border-t border-surface px-4 py-3 bg-surface-2">

      {/* ── Barra de gravação compacta ── */}
      {(recording || transcribing) ? (
        <div className="flex items-center gap-2 h-[52px] px-3 rounded-lg border"
          style={{ background: 'var(--surface-3)', borderColor: 'var(--border)' }}>

          {transcribing ? (
            <>
              <i className="fa-solid fa-spinner fa-spin text-xs flex-shrink-0" style={{ color: 'var(--primary)' }} />
              <span className="text-xs flex-1" style={{ color: 'var(--text-muted)' }}>A transcrever...</span>
            </>
          ) : (
            <>
              {/* Ondas animadas */}
              <div className="flex items-center gap-[3px] flex-shrink-0">
                {[0.5, 0.9, 0.6, 1, 0.7, 0.8, 0.5, 0.9, 0.6].map((h, i) => (
                  <div key={i} style={{
                    width: '3px', height: `${h * 20}px`,
                    background: 'var(--primary)', borderRadius: '2px',
                    animation: `voiceWave 0.7s ease-in-out ${i * 0.07}s infinite alternate`,
                  }} />
                ))}
              </div>
              <span className="text-xs flex-1" style={{ color: 'var(--text-muted)' }}>A ouvir...</span>

              {/* Um único botão: para E envia directamente ao chatbot */}
              <button type="button" onClick={() => stopAndTranscribe(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-white flex-shrink-0"
                style={{ background: '#ef4444' }}>
                <i className="fa-solid fa-stop text-[10px]" /> Parar
              </button>
            </>
          )}
        </div>
      ) : (
        /* ── Estado normal ── */
        <div className="flex gap-2 items-end">
          <textarea ref={inputRef} value={value} onChange={onChange}
            onKeyPress={handleKeyPress}
            placeholder="Escreve ou fala a tua mensagem..."
            disabled={disabled} rows={2}
            className="flex-1 bg-surface-3 text-main border border-surface rounded-lg px-3 py-2 resize-none focus:outline-none focus:border-[var(--primary)] disabled:opacity-50 text-sm placeholder:text-muted"
          />
          <button type="button" onClick={startRecording} disabled={disabled} title="Falar"
            className="flex-shrink-0 flex items-center justify-center w-9 h-9 rounded-lg border transition disabled:opacity-50"
            style={{ background: 'var(--surface-3)', color: 'var(--primary)', borderColor: 'var(--border)' }}>
            <i className="fa-solid fa-microphone text-sm" />
          </button>
          <button type="submit" disabled={disabled || !value.trim()}
            className="flex-shrink-0 bg-[var(--primary)] hover:bg-[var(--primary-hover)] text-white font-semibold px-3 py-2 rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed">
            {disabled ? "⏳" : "➤"}
          </button>
        </div>
      )}

      <p className="text-muted text-xs mt-2 px-0.5">Enter para enviar · Shift+Enter nova linha</p>

      <style>{`
        @keyframes voiceWave {
          from { transform: scaleY(0.3); } to { transform: scaleY(1); }
        }
      `}</style>
    </form>
  );
}
