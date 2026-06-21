import { useRef, useState } from "react";
import { transcribeAudio } from "@/services/voiceService.js";

// Área de entrada do chat: texto + envio + microfone (Whisper V3 via Groq).
export function ChatInputUI({ value, onChange, onSubmit, onVoiceSend, disabled = false, inputRef }) {
  const [recording, setRecording]       = useState(false);
  const [transcribing, setTranscribing] = useState(false);
  const mediaRef  = useRef(null);
  const chunksRef = useRef([]);
  const mimeRef   = useRef('audio/webm');

  const handleKeyPress = (e) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); onSubmit(e); }
  };

  const startRecording = async () => {
    try {
      const stream   = await navigator.mediaDevices.getUserMedia({ audio: true });
      chunksRef.current = [];
      // Forçar audio/webm para garantir que não usa video/webm
      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : 'audio/webm';
      mimeRef.current = mimeType;
      const recorder = new MediaRecorder(stream, { mimeType });
      
      // ✅ CRÍTICO: Registar ondataavailable ANTES de start()
      recorder.ondataavailable = (e) => {
        console.log('[Voice] chunk tamanho:', e.data?.size, 'bytes');
        if (e.data && e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };
      
      // timeslice=500ms garante dados mesmo em gravações muito curtas
      recorder.start(500);
      mediaRef.current = recorder;
      setRecording(true);
    } catch (err) { console.error('[Voice] erro ao iniciar gravação:', err); }
  };

  const stopAndTranscribe = async (autoSend = false) => {
    const recorder = mediaRef.current;
    if (!recorder || recorder.state === 'inactive') return;
    const savedMime = mimeRef.current || 'audio/webm';
    setRecording(false);

    await new Promise((resolve) => {
      // ✅ CRÍTICO: requestData() ANTES de stop() para flush final de dados
      recorder.onstop = () => {
        console.log('[Voice] onstop acionado, total chunks:', chunksRef.current.length);
        recorder.stream.getTracks().forEach(t => t.stop());
        resolve();
      };
      
      // ✅ Força flush do buffer: disparará ondataavailable uma última vez
      recorder.requestData();
      
      // ✅ Depois de requestData(), para o gravador
      setTimeout(() => recorder.stop(), 100);
    });

    console.log('[Voice] total chunks capturados:', chunksRef.current.length, 
                chunksRef.current.map(c => `${c.size}b`).join(' + '));
    
    setTranscribing(true);
    try {
      const blob = new Blob(chunksRef.current, { type: savedMime });
      console.log('[Voice] blob final:', blob.size, 'bytes, type:', savedMime);
      
      if (blob.size < 500) { 
        console.warn('[Voice] ⚠️ blob muito pequeno (<500bytes), gravação falhou');
        return; 
      }
      
      const text = await transcribeAudio(blob, savedMime);
      if (!text) return;
      
      if (autoSend && onVoiceSend) {
        onVoiceSend(text);           // envia directamente ao chatbot
      } else {
        onChange({ target: { value: (value ? value + ' ' : '') + text } });
      }
    } catch (err) { 
      console.error('[Voice] erro na transcrição:', err.message);
    }
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
