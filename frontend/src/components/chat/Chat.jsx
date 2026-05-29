import { useState, useRef, useEffect } from 'react';
import { chatService } from '@/services/chatService';

export function ChatMessage({ message, sender }) {
  const isBot = sender === 'bot';

  return (
    <div className={`flex ${isBot ? 'justify-start' : 'justify-end'} mb-4`}>
      <div className={`max-w-xs lg:max-w-md px-4 py-3 rounded-lg ${
        isBot
          ? 'bg-surface-3 text-secondary rounded-bl-none'
          : 'bg-[var(--primary)] text-white rounded-br-none'
      }`}>
        <p className="text-sm">{message}</p>
      </div>
    </div>
  );
}

export function ChatInput({ onSendMessage, disabled = false }) {
  const [input, setInput] = useState('');
  const inputRef = useRef(null);

  const handleSend = () => {
    if (input.trim()) {
      onSendMessage(input);
      setInput('');
      inputRef.current?.focus();
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="flex gap-2">
      <textarea
        ref={inputRef}
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Escreva a sua mensagem..."
        disabled={disabled}
        className="flex-1 bg-surface-3 text-main border border-surface rounded-lg px-4 py-3 resize-none focus:outline-none focus:border-[var(--primary)] disabled:opacity-50 placeholder:text-muted"
        rows={3}
      />
      <button
        onClick={handleSend}
        disabled={disabled || !input.trim()}
        className="bg-[var(--primary)] hover:bg-[var(--primary-hover)] text-white font-semibold px-6 py-3 rounded-lg transition disabled:opacity-50 self-end"
      >
        {disabled ? '⏳' : '📤'}
      </button>
    </div>
  );
}

export function Chat() {
  const [messages, setMessages] = useState([
    {
      id: 1,
      text: "Olá! 👋 Sou o Assistente IA. Como posso ajudar?",
      sender: 'bot',
    },
  ]);
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = async (userMessage) => {
    const botMsgId = messages.length + 2;

    setMessages(prev => [
      ...prev,
      { id: messages.length + 1, text: userMessage, sender: 'user' },
      { id: botMsgId, text: '', sender: 'bot' },
    ]);
    setLoading(true);

    try {
      await chatService.sendMessageToBotStream(
        userMessage,
        messages.map(m => ({ role: m.sender === 'bot' ? 'assistant' : 'user', content: m.text })),
        (chunk) => {
          setMessages(prev =>
            prev.map(msg =>
              msg.id === botMsgId
                ? { ...msg, text: msg.text === 'Aguardando resposta...' ? chunk : `${msg.text || ''}${chunk}` }
                : msg
            )
          );
        },
        () => {},
        null,
        null,
        () => {
          setMessages(prev =>
            prev.map(msg =>
              msg.id === botMsgId ? { ...msg, text: 'Aguardando resposta...' } : msg
            )
          );
        }
      );
    } catch (error) {
      setMessages(prev =>
        prev.map(msg =>
          msg.id === botMsgId
            ? { ...msg, text: '❌ Erro ao processar mensagem. Tenta novamente!' }
            : msg
        )
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-[#1a1a1a] rounded-lg border border-[#333333]">
      {/* Header */}
      <div className="border-b border-[#333333] px-6 py-4">
        <h2 className="text-xl font-bold text-white flex items-center gap-2">
          <span>💬</span> Assistente IA
        </h2>
        <p className="text-gray-400 text-sm mt-1">Como posso ajudar?</p>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
        {messages.map(msg => (
          <ChatMessage key={msg.id} message={msg.text} sender={msg.sender} />
        ))}
        {loading && (
          <div className="flex justify-start mb-4">
            <div className="bg-[#2a2a2a] text-gray-300 px-4 py-3 rounded-lg rounded-bl-none">
              <div className="flex gap-2">
                <span className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" />
                <span className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }} />
                <span className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="border-t border-[#333333] px-6 py-4">
        <ChatInput onSendMessage={handleSendMessage} disabled={loading} />
      </div>
    </div>
  );
}
