/**
 * ChatBubbleUI - Renderiza uma bolha de mensagem
 * Padrão: Componente UI reutilizável
 */
export function ChatBubbleUI({ message, sender }) {
  const isBot = sender !== 'user';

  return (
    <div className={`flex ${isBot ? 'justify-start' : 'justify-end'} animate-fadeIn`}>
      <div
        className={`max-w-xs px-4 py-3 rounded-lg ${
          isBot
            ? 'bg-surface-3 text-secondary rounded-bl-none'
            : 'bg-[var(--primary)] text-white rounded-br-none'
        }`}
      >
        <p className="text-sm whitespace-pre-wrap">{message.text}</p>

        {message.functionResults?.length > 0 && !message.persistenceErrors?.length && !message.text && (
          <div className="mt-3 bg-surface-2 border border-surface rounded-lg p-3 text-xs text-secondary">
            {message.functionResults.map((result, index) => (
              <div key={index} className="mb-3 last:mb-0">
                <p className="font-semibold text-[11px] text-[var(--primary)] mb-1">
                  Função: {result.functionName}
                </p>
                <pre className="overflow-x-auto whitespace-pre-wrap bg-[#0f172a] p-2 rounded text-[11px] text-slate-100">
                  {JSON.stringify(result.result || result.arguments, null, 2)}
                </pre>
              </div>
            ))}
          </div>
        )}

        {message.timestamp && (
          <p className="text-xs mt-1 opacity-70">
            {message.timestamp.toLocaleTimeString([], {
              hour: '2-digit',
              minute: '2-digit'
            })}
          </p>
        )}
      </div>
    </div>
  );
}
