// Área de entrada do chat: texto + envio
export function ChatInputUI({ value, onChange, onSubmit, disabled = false, inputRef }) {
  const handleKeyPress = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      onSubmit(e);
    }
  };

  return (
    <form onSubmit={onSubmit} className="border-t border-surface px-4 py-3 bg-surface-2">
      <div className="flex gap-2 items-end">
        <textarea
          ref={inputRef}
          value={value}
          onChange={onChange}
          onKeyPress={handleKeyPress}
          placeholder="Escreve a tua mensagem..."
          disabled={disabled}
          className="flex-1 bg-surface-3 text-main border border-surface rounded-lg px-3 py-2 resize-none focus:outline-none focus:border-[var(--primary)] disabled:opacity-50 text-sm placeholder:text-muted"
          rows={2}
        />
        <button
          type="submit"
          disabled={disabled || !value.trim()}
          className="flex-shrink-0 bg-[var(--primary)] hover:bg-[var(--primary-hover)] text-white font-semibold px-3 py-2 rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {disabled ? "⏳" : "➤"}
        </button>
      </div>
      <p className="text-muted text-xs mt-2 px-0.5">
        💡 Enter para enviar · Shift+Enter nova linha
      </p>
    </form>
  );
}
