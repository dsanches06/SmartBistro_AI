// Componente que renderiza uma mensagem individual do chat (bot ou utilizador)
export function ChatMessage({ message, sender, timestamp }) {
  // Determina se a mensagem é do bot ou do utilizador
  const isBot = sender === 'bot';

  return (
    <div className={`flex ${isBot ? 'justify-start' : 'justify-end'} mb-4 animate-fadeIn`}>
      {/* Balão da mensagem com estilo diferente para bot e utilizador */}
      <div className={`max-w-xs lg:max-w-md px-4 py-3 rounded-lg flex items-end gap-2 ${
        isBot
          ? 'bg-surface-3 text-secondary rounded-bl-none'
          : 'bg-[var(--primary)] text-white rounded-br-none'
      }`}>
        <div className="flex-1">
          <p className="text-sm leading-relaxed break-words">{message}</p>
          {/* Hora de envio formatada em pt-PT */}
          {timestamp && (
            <span className={`text-xs mt-1 block ${isBot ? 'text-muted' : 'text-blue-200'}`}>
              {new Date(timestamp).toLocaleTimeString('pt-PT', {
                hour: '2-digit',
                minute: '2-digit'
              })}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

export default ChatMessage;
