import { useState, useRef, useEffect } from 'react';
import { chatService } from '@/services/chatService';

/**
 * Componente de Chat com Bot GenAI
 * Envia mensagens e executa function calls
 */
export function ChatBot() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [conversationHistory, setConversationHistory] = useState([]);
  const [conversationId, setConversationId] = useState(null);
  const [streamingBotMessageId, setStreamingBotMessageId] = useState(null);
  const messagesEndRef = useRef(null);

  // Fazer scroll para o final das mensagens
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  /**
   * Enviar mensagem para o bot
   */
  const handleSendMessage = async (e) => {
    e.preventDefault();

    if (!input.trim()) return;

    const userMessage = input.trim();
    setInput('');
    setError(null);
    setLoading(true);

    const botMsgId = Date.now() + 1;
    const userMsg = {
      id: Date.now(),
      text: userMessage,
      sender: 'user',
      timestamp: new Date(),
    };
    const botMsg = {
      id: botMsgId,
      text: '',
      sender: 'bot',
      timestamp: new Date(),
      functionResults: [],
    };

    const updatedConversationHistory = [
      ...conversationHistory,
      { role: 'user', content: userMessage },
    ];

    setMessages((prev) => [...prev, userMsg, botMsg]);
    setConversationHistory(updatedConversationHistory);
    setStreamingBotMessageId(botMsgId);

    try {
      await chatService.sendMessageToBotStream(
        userMessage,
        updatedConversationHistory,
        (chunk) => {
          setMessages((prev) =>
            prev.map((msg) =>
              msg.id === botMsgId
                ? { ...msg, text: `${msg.text || ''}${chunk}` }
                : msg
            )
          );
        },
        (donePayload) => {
          setStreamingBotMessageId(null);

          if (donePayload?.conversationId) {
            setConversationId(donePayload.conversationId);
          }

          if (donePayload?.message) {
            setMessages((prev) =>
              prev.map((msg) =>
                msg.id === botMsgId
                  ? { ...msg, text: donePayload.message }
                  : msg
              )
            );
            setConversationHistory((prev) => [
              ...prev,
              { role: 'assistant', content: donePayload.message },
            ]);
          }

          if (donePayload?.functionResults?.length) {
            setMessages((prev) =>
              prev.map((msg) =>
                msg.id === botMsgId
                  ? { ...msg, functionResults: donePayload.functionResults }
                  : msg
              )
            );
          }
        },
        conversationId,
      );
    } catch (err) {
      setError(err.message);
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === botMsgId
            ? {
                ...msg,
                text: `Erro: ${err.message}`,
                isError: true,
              }
            : msg
        )
      );
    } finally {
      setLoading(false);
      setStreamingBotMessageId(null);
    }
  };

  return (
    <div className="flex flex-col h-full bg-surface-1 rounded-lg border border-surface">
      {/* Header */}
      <div className="bg-[var(--primary)] text-white p-4 rounded-t-lg">
        <h2 className="text-lg font-semibold">Assistente IA</h2>
        <p className="text-sm opacity-90">Como posso ajudar?</p>
      </div>

      {/* Messages Container */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 ? (
          <div className="flex items-center justify-center h-full text-muted">
            <div className="text-center">
              <p className="mb-2">💬 Nenhuma mensagem ainda</p>
              <p className="text-sm">Comece digitando uma mensagem abaixo</p>
            </div>
          </div>
        ) : (
          messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex ${
                msg.sender === 'user' ? 'justify-end' : 'justify-start'
              }`}
            >
              <div
                className={`max-w-xs lg:max-w-md px-4 py-3 rounded-lg ${
                  msg.sender === 'user'
                    ? 'bg-[var(--primary)] text-white rounded-br-none'
                    : msg.sender === 'system'
                    ? 'bg-green-100 text-green-800 rounded-bl-none'
                    : msg.isError
                    ? 'bg-red-100 text-red-800 rounded-bl-none'
                    : 'bg-surface-3 text-secondary rounded-bl-none'
                }`}
              >
                <p className="text-sm break-words">{msg.text}</p>

                <p className="text-xs opacity-70 mt-1">
                  {msg.timestamp.toLocaleTimeString('pt-BR')}
                </p>
              </div>
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-100 text-red-700 px-4 py-2 mx-4 rounded mb-2 text-sm">
          {error}
        </div>
      )}

      {/* Input Form */}
      <form onSubmit={handleSendMessage} className="border-t border-surface p-4">
        <div className="flex gap-2">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSendMessage(e);
              }
            }}
            placeholder="Escreva a sua mensagem..."
            disabled={loading}
            className="flex-1 bg-surface-3 text-main border border-surface rounded-lg px-4 py-2 resize-none focus:outline-none focus:border-[var(--primary)] disabled:opacity-50"
            rows={3}
          />
          <button
            type="submit"
            disabled={loading || !input.trim()}
            className="bg-[var(--primary)] hover:opacity-90 text-white px-6 py-2 rounded-lg font-semibold disabled:opacity-50 transition h-fit"
          >
            {loading ? '⏳' : '📤'}
          </button>
        </div>
      </form>
    </div>
  );
}

export default ChatBot;
