/**
 * @fileoverview Componente ChatUI - Interface principal do chat com FinancIA.
 */

import { useState, useRef, useEffect } from "react";
import { chatService } from "@/services/chatService";
import {
  ChatBubbleUI,
  ChatHeaderUI,
  ChatLoadingUI,
  ChatInputUI,
  ProviderErrorCard,
} from "@/components/chat/index.js";
import {
  groupConversationsByDate,
  formatConversationDate,
  createWelcomeMessage,
} from "@/utils/chatUtils";

// ── ChatUI ────────────────────────────────────────────────────────────────────
export function ChatUI({ isOpen, onClose }) {
  const [messages, setMessages]                     = useState([createWelcomeMessage()]);
  const [input, setInput]                           = useState("");
  const [loading, setLoading]                       = useState(false);
  const [conversationHistory, setConversationHistory] = useState([]);
  const [conversationId, setConversationId]         = useState(null);
  const [conversations, setConversations]           = useState([]);
  const [showHistory, setShowHistory]               = useState(false);
  const [lastUserMessage, setLastUserMessage]       = useState(null);
  const [pendingFile, setPendingFile]               = useState(null);
  const messagesEndRef   = useRef(null);
  const inputRef         = useRef(null);
  const messageIdCounter = useRef(1);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    if (isOpen) inputRef.current?.focus();
  }, [isOpen]);

  useEffect(() => {
    if (!loading) inputRef.current?.focus();
  }, [loading]);

  useEffect(() => {
    if (!isOpen) return;
    chatService
      .getConversations()
      .then((all) => {
        if (all?.length) {
          setConversations(all);
          setShowHistory(true);
        }
      })
      .catch(() => {});
  }, [isOpen]);

  // ── Conversation history ──────────────────────────────────────────────────

  const handleSelectConversation = async (conv) => {
    setConversationId(conv.id);
    setShowHistory(false);
    try {
      const historyRows = await chatService.getChatHistory(conv.id);
      const rows = Array.isArray(historyRows) ? historyRows : [];

      const history = rows.map((r) => ({
        role: r.role_id === 2 ? "user" : "assistant",
        content: r.content,
      }));
      setConversationHistory(history);

      const lastMessages = rows.slice(-5).map((r, index) => ({
        id: `${conv.id}-${r.id ?? index}`,
        text: r.content,
        sender: r.role_id === 2 ? "user" : "bot",
        timestamp: r.created_at ? new Date(r.created_at) : new Date(),
      }));

      setMessages(
        lastMessages.length > 0
          ? lastMessages
          : [{ id: `${conv.id}-empty`, text: "Esta conversa ainda não contém mensagens.", sender: "bot", timestamp: new Date() }],
      );
    } catch {
      setMessages([{ id: `${conv.id}-e`, text: "Não foi possível carregar o histórico.", sender: "bot", timestamp: new Date() }]);
      setConversationHistory([]);
    }
  };

  const handleNewConversation = () => {
    setConversationId(null);
    setShowHistory(false);
    setMessages([{ ...createWelcomeMessage(), timestamp: new Date() }]);
    setConversationHistory([]);
    setLastUserMessage(null);
    setPendingFile(null);
    setTimeout(() => inputRef.current?.focus(), 100);
  };

  // ── Helpers SSE callbacks ─────────────────────────────────────────────────

  const makeOnChunk = (botMsgId) => (text) => {
    setMessages((p) =>
      p.map((m) => m.id === botMsgId ? { ...m, text: m.text + text } : m)
    );
  };

  const TABLE_MUTATION_FNS = ['cancel_reservation', 'create_reservation', 'update_table_status'];

  const makeOnDone = (botMsgId) => (payload) => {
    setLoading(false);
    if (payload?.conversationId) setConversationId(payload.conversationId);

    if (payload?.success && payload?.message) {
      setConversationHistory((prev) => [
        ...prev,
        { role: "assistant", content: payload.message },
      ]);
    }

    const results = payload?.functionResults ?? [];

    // Notifica TablePage para re-fetch quando o bot muda mesas/reservas
    const hasMutation = results.some((r) => TABLE_MUTATION_FNS.includes(r.functionName));
    if (hasMutation) {
      window.dispatchEvent(new CustomEvent('table:refresh'));
    }

    // Marca mensagem como "done" quando cancelamento ou criação de reserva é bem-sucedido
    const isDone =
      results.some((r) => r.functionName === 'cancel_reservation' && r.result?.success) ||
      results.some((r) => r.functionName === 'create_reservation' && r.result?.id);

    if (isDone || results.length) {
      setMessages((p) =>
        p.map((m) =>
          m.id === botMsgId
            ? { ...m, done: isDone, functionResults: results }
            : m
        )
      );
    }

    if (!payload?.success) {
      setMessages((p) =>
        p.map((m) =>
          m.id === botMsgId
            ? { ...m, text: "", providerError: { errorType: payload.errorType || "SERVER_ERROR", message: payload.message || "Erro inesperado." } }
            : m
        )
      );
    }
  };

  // ── Send text message ─────────────────────────────────────────────────────

  const doSend = async (userMessage) => {
    const userMsgId = messageIdCounter.current++;
    const botMsgId  = messageIdCounter.current++;

    const updatedHistory = [
      ...conversationHistory,
      { role: "user", content: userMessage },
    ];

    setMessages((p) => [
      ...p,
      { id: userMsgId, text: userMessage, sender: "user", timestamp: new Date() },
      { id: botMsgId,  text: "",          sender: "bot",  timestamp: new Date(), providerError: null },
    ]);
    setConversationHistory(updatedHistory);
    setLoading(true);

    await chatService.sendMessageToBotStream(
      userMessage,
      updatedHistory,
      makeOnChunk(botMsgId),
      makeOnDone(botMsgId),
      conversationId,
    );
  };

  // ── Send CSV file ─────────────────────────────────────────────────────────

  const doSendFile = async (file, message) => {
    const displayText = message ? `📎 ${file.name} — ${message}` : `📎 ${file.name}`;
    const userMsgId = messageIdCounter.current++;
    const botMsgId  = messageIdCounter.current++;

    setMessages((p) => [
      ...p,
      { id: userMsgId, text: displayText, sender: "user", timestamp: new Date() },
      { id: botMsgId,  text: "",          sender: "bot",  timestamp: new Date(), providerError: null },
    ]);
    setLoading(true);

    await chatService.uploadCsv(
      file,
      message,
      conversationId,
      conversationHistory,
      makeOnChunk(botMsgId),
      (payload) => {
        makeOnDone(botMsgId)(payload);
        if (payload?.success && payload?.message) {
          setConversationHistory((prev) => [
            ...prev,
            { role: "user",      content: displayText },
            { role: "assistant", content: payload.message },
          ]);
        }
      },
    );
  };

  // ── handleSend ────────────────────────────────────────────────────────────

  const handleSend = async (e) => {
    e.preventDefault();
    if (loading) return;

    if (pendingFile) {
      const file    = pendingFile;
      const message = input.trim();
      setLastUserMessage(`📎 ${file.name}`);
      setPendingFile(null);
      setInput("");
      await doSendFile(file, message);
      return;
    }

    if (!input.trim()) return;
    const userMessage = input.trim();
    setLastUserMessage(userMessage);
    setInput("");
    await doSend(userMessage);
  };

  const handleRetry = async () => {
    if (!lastUserMessage || loading) return;
    setMessages((p) => {
      const lastBotIdx = [...p].reverse().findIndex((m) => m.sender === "bot");
      if (lastBotIdx === -1) return p;
      const idx = p.length - 1 - lastBotIdx;
      return p.filter((_, i) => i !== idx && i !== idx - 1);
    });
    if (!lastUserMessage.startsWith("📎")) {
      await doSend(lastUserMessage);
    }
  };

  if (!isOpen) return null;

  const grouped = groupConversationsByDate(conversations);

  return (
    <>
      {/* Mobile backdrop */}
      <div
        className="fixed inset-0 bg-black/50 z-40 md:hidden"
        onClick={onClose}
      />

      <div
        className={[
          "fixed z-50 flex flex-col bg-page border border-surface shadow-2xl overflow-hidden",
          "inset-x-0 top-14 bottom-0 rounded-none",
          "md:inset-auto md:bottom-6 md:right-6 md:w-[340px] md:h-[80vh] md:min-h-[420px] md:rounded-3xl",
        ].join(" ")}
      >
        <ChatHeaderUI onClose={onClose} />

        {/* ── History overlay ── */}
        {showHistory && (
          <div className="absolute inset-0 z-50 bg-page flex flex-col md:rounded-3xl">
            <div className="px-4 py-3 border-b border-surface flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-main">Histórico</h3>
                <p className="text-xs text-muted mt-0.5">
                  {conversations.length} conversa{conversations.length !== 1 ? "s" : ""}
                </p>
              </div>
              <button
                onClick={handleNewConversation}
                className="text-xs px-3 py-1.5 bg-[var(--primary)] text-white rounded-lg hover:bg-[var(--primary-hover)] font-medium"
              >
                + Nova
              </button>
            </div>
            <div className="flex-1 overflow-y-auto">
              {grouped.map(({ label, convs }) => (
                <div key={label}>
                  <div className="px-4 py-1.5 bg-surface sticky top-0">
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-muted">
                      {label}
                    </span>
                  </div>
                  {convs.map((conv) => (
                    <button
                      key={conv.id}
                      onClick={() => handleSelectConversation(conv)}
                      className="w-full px-4 py-3 text-left hover:bg-surface-2 active:bg-surface-3 border-b border-surface transition-colors group cursor-pointer"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-sm font-medium text-main truncate flex-1 group-hover:text-[var(--primary)] transition-colors">
                          {conv.title}
                        </p>
                        <span className="text-lg flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                          📋
                        </span>
                      </div>
                      <p className="text-xs text-muted mt-0.5">
                        {formatConversationDate(conv.created_at)}
                      </p>
                    </button>
                  ))}
                </div>
              ))}
              {conversations.length === 0 && (
                <div className="flex items-center justify-center h-32 text-muted text-sm">
                  Nenhuma conversa
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── Chat view ── */}
        {!showHistory && (
          <>
            <div className="flex-1 overflow-y-auto bg-surface-2 px-4 py-4 space-y-4">
              {messages.map((msg) => (
                <div key={msg.id}>
                  {msg.text && <ChatBubbleUI message={msg} sender={msg.sender} />}
                  {msg.providerError && (
                    <div className="flex justify-start mt-1">
                      <div className="max-w-[280px] w-full">
                        <ProviderErrorCard
                          errorType={msg.providerError.errorType}
                          message={msg.providerError.message}
                          onRetry={handleRetry}
                        />
                      </div>
                    </div>
                  )}
                </div>
              ))}
              {loading && <ChatLoadingUI />}
              <div ref={messagesEndRef} />
            </div>

            <ChatInputUI
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onSubmit={handleSend}
              disabled={loading}
              inputRef={inputRef}
              onFileSelect={setPendingFile}
              selectedFile={pendingFile}
              onRemoveFile={() => setPendingFile(null)}
            />

            {conversations.length > 0 && (
              <button
                onClick={() => setShowHistory(true)}
                className="py-2 text-xs text-muted hover:text-main transition-colors border-t border-surface text-center"
              >
                📋 Ver histórico ({conversations.length})
              </button>
            )}
          </>
        )}
      </div>
    </>
  );
}
