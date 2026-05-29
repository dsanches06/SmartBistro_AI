// Indicador animado de "a processar" enquanto o bot responde
export function ChatLoadingUI() {
  return (
    <div className="flex justify-start animate-fadeIn">
      <div className="bg-[#2a2a2a] text-gray-300 px-4 py-3 rounded-lg rounded-bl-none">
        {/* Três pontos com animação bounce desfasada */}
        <div className="flex gap-2">
          <span className="w-2 h-2 bg-blue-500 rounded-full animate-bounce"></span>
          <span
            className="w-2 h-2 bg-blue-500 rounded-full animate-bounce"
            style={{ animationDelay: '0.1s' }}
          ></span>
          <span
            className="w-2 h-2 bg-blue-500 rounded-full animate-bounce"
            style={{ animationDelay: '0.2s' }}
          ></span>
        </div>
      </div>
    </div>
  );
}
