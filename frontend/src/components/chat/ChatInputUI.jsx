import { useRef } from "react";

function IconPaperclip({ className }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
      style={{ transform: "rotate(45deg)" }}
    >
      <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48" />
    </svg>
  );
}

function IconFileCheck({ className }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
      <polyline points="14 2 14 8 20 8" />
      <polyline points="9 15 11 17 15 13" />
    </svg>
  );
}

// Área de entrada do chat: texto + anexo CSV
export function ChatInputUI({
  value,
  onChange,
  onSubmit,
  disabled = false,
  inputRef,
  onFileSelect,
  selectedFile,
  onRemoveFile,
}) {
  const localInputRef = useRef(null);
  const ref = inputRef || localInputRef;
  const fileInputRef = useRef(null);

  const handleKeyPress = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      onSubmit(e);
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file) onFileSelect?.(file);
    e.target.value = "";
  };

  const canSubmit = !disabled && (value.trim() || selectedFile);

  return (
    <form
      onSubmit={onSubmit}
      className="border-t border-surface px-4 py-3 bg-surface-2"
    >
      {/* Indicador do ficheiro seleccionado */}
      {selectedFile && (
        <div className="flex items-center gap-2 mb-2">
          <span className="inline-flex items-center gap-1.5 text-xs bg-[var(--primary)]/10 text-[var(--primary)] border border-[var(--primary)]/30 px-2.5 py-1 rounded-full max-w-full">
            <IconFileCheck className="w-3.5 h-3.5 flex-shrink-0" />
            <span className="truncate max-w-[200px] font-medium">
              {selectedFile.name}
            </span>
            <button
              type="button"
              onClick={onRemoveFile}
              className="flex-shrink-0 ml-0.5 opacity-70 hover:opacity-100 transition-opacity leading-none"
              aria-label="Remover ficheiro"
            >
              ✕
            </button>
          </span>
        </div>
      )}

      <div className="flex gap-2 items-end">
        {/* Input de ficheiro oculto — aceita apenas CSV */}
        <input
          ref={fileInputRef}
          type="file"
          accept=".csv"
          className="hidden"
          onChange={handleFileChange}
        />

        {/* Botão para abrir o selector de ficheiro */}
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={disabled}
          title="Anexar ficheiro CSV"
          aria-label="Anexar CSV"
          className={[
            "flex-shrink-0 p-2 rounded-lg transition-colors",
            "disabled:opacity-40 disabled:cursor-not-allowed",
            selectedFile
              ? "text-[var(--primary)] bg-[var(--primary)]/10"
              : "text-muted hover:text-main hover:bg-surface-3",
          ].join(" ")}
        >
          <IconPaperclip className="w-6 h-6 rotate-90" />
        </button>

        {/* Campo de texto */}
        <textarea
          ref={ref}
          value={value}
          onChange={onChange}
          onKeyPress={handleKeyPress}
          placeholder={
            selectedFile
              ? "Mensagem opcional sobre o CSV..."
              : "Escreve a tua mensagem..."
          }
          disabled={disabled}
          className="flex-1 bg-surface-3 text-main border border-surface rounded-lg px-3 py-2 resize-none focus:outline-none focus:border-[var(--primary)] disabled:opacity-50 text-sm placeholder:text-muted"
          rows={2}
        />

        {/* Botão de envio */}
        <button
          type="submit"
          disabled={!canSubmit}
          className="flex-shrink-0 bg-[var(--primary)] hover:bg-[var(--primary-hover)] text-white font-semibold px-3 py-2 rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {disabled ? "⏳" : "➤"}
        </button>
      </div>

      <p className="text-muted text-xs mt-2 px-0.5">
        💡 Enter para enviar · Shift+Enter nova linha · CSV via botão de upload
      </p>
    </form>
  );
}
