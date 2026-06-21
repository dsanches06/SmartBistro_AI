/**
 * @fileoverview Componente ChatUI - Interface principal do chat com FinancIA.
 */

import { useState, useRef, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { useTableRefresh } from "@/context/TableRefreshContext";
import { chatService } from "@/services/chatService";
import { paymentService } from "@/services/paymentService";
import { tableService } from "@/services/tableService";
import { PaymentModal } from "@/components/ui/modals/PaymentModal.jsx";
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
  const { user } = useAuth();
  const { triggerTableRefresh } = useTableRefresh();
  const customerName = user?.name ?? null;
  const [takeawayPayModal, setTakeawayPayModal] = useState(null); // { inv, userId }
  const [messages, setMessages]                     = useState([createWelcomeMessage()]);
  const [input, setInput]                           = useState("");
  const [loading, setLoading]                       = useState(false);
  const [conversationHistory, setConversationHistory] = useState([]);
  const [conversationId, setConversationId]         = useState(null);
  const [conversations, setConversations]           = useState([]);
  const [showHistory, setShowHistory]               = useState(false);
  const [lastUserMessage, setLastUserMessage]       = useState(null);
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
        if (all?.length) setConversations(all);
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
    setTimeout(() => inputRef.current?.focus(), 100);
  };

  // ── Helpers SSE callbacks ─────────────────────────────────────────────────

  const makeOnChunk = (botMsgId) => (text) => {
    setMessages((p) =>
      p.map((m) => m.id === botMsgId ? { ...m, text: m.text + text } : m)
    );
  };

  const TABLE_MUTATION_FNS = ['cancel_reservation', 'create_reservation', 'update_table_status', 'create_order', 'create_order_item'];

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
    if (hasMutation) triggerTableRefresh();

    // Detecta fatura criada mas pagamento ainda não efectuado → mostra botões de pagamento
    const invoiceResult  = results.find(r => r.functionName === 'create_invoice' && r.result?.id);
    const paymentDone    = results.some(r => r.functionName === 'create_payment'  && r.result?.id);
    const orderResult    = results.find(r => r.functionName === 'create_order');
    const isTakeaway     = orderResult?.result?.service_type === 'Takeaway';
    const pointsResult   = results.find(r => r.functionName === 'redeem_customer_points' && r.result?.discount);
    const pointsDiscount = pointsResult?.result?.discount ?? 0;
    const tableResult = results.find(r => r.functionName === 'update_table_status' || r.functionName === 'get_table');
    const tableId     = tableResult?.result?.id ?? orderResult?.result?.table_id ?? null;
    const pendingPayment = (!paymentDone && invoiceResult)
      ? { invoice_id: invoiceResult.result.id, amount: Math.max(0, Number(invoiceResult.result.total_amount) - pointsDiscount), isTakeaway, tableId }
      : null;

    // Marca mensagem como "done" quando cancelamento ou criação de reserva é bem-sucedido
    const isDone =
      results.some((r) => r.functionName === 'cancel_reservation' && r.result?.success) ||
      results.some((r) => r.functionName === 'create_reservation' && r.result?.id);

    // Detecta items do menu em resultados de funções e mostra como cards
    const MENU_FNS = ['get_items', 'get_active', 'getItems', 'getActive'];
    const menuItems = results.flatMap(r => {
      if (!MENU_FNS.includes(r.functionName)) return [];
      const res = r.result;
      if (Array.isArray(res)) return res.filter(i => i?.name && i?.price !== undefined);
      return [];
    });

    if (isDone || results.length) {
      setMessages((p) =>
        p.map((m) =>
          m.id === botMsgId
            ? {
                ...m,
                done: isDone,
                functionResults: results,
                ...(menuItems.length > 0    ? { menuItems }    : {}),
                ...(pendingPayment          ? { pendingPayment } : {}),
              }
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
      user?.id ?? null,
      null,
      customerName,
    );
  };

  // ── handleSend ────────────────────────────────────────────────────────────

  const handleSend = async (e) => {
    e.preventDefault();
    if (loading || !input.trim()) return;
    const userMessage = input.trim();
    setLastUserMessage(userMessage);
    setInput("");
    await doSend(userMessage);
  };

  const handleMenuOrder = (itemNames) => {
    if (loading) return;
    doSend(`Quero pedir ${itemNames}`);
  };

  // Pagamento por botão (mesa/dine-in) — chama a API directamente sem passar pelo chat
  const handlePaymentMethod = async (msgId, method, invoiceId, amount, tableId) => {
    try {
      await paymentService.create({
        invoice_id:     invoiceId,
        user_id:        user?.id ?? null,
        amount,
        payment_method: method,
        payment_status: "Completed",
      });
      // Liberta a mesa automaticamente após pagamento
      if (tableId) await tableService.updateStatus(tableId, "Available").catch(() => {});
      setMessages(p => p.map(m => m.id === msgId ? { ...m, pendingPayment: null, paymentDone: method } : m));
      triggerTableRefresh();
      doSend(`Paguei com ${method}`);
    } catch (e) {
      setMessages(p => p.map(m => m.id === msgId ? { ...m, paymentError: e.message } : m));
    }
  };

  // TAKEAWAY via chat — abre o PaymentModal com o método de pagamento visual
  const handleTakeawayPay = (msgId, invoiceId, amount) => {
    setTakeawayPayModal({ inv: { id: invoiceId, total_amount: amount }, userId: user?.id ?? null, msgId });
  };

  const handleRetry = async () => {
    if (!lastUserMessage || loading) return;
    setMessages((p) => {
      const lastBotIdx = [...p].reverse().findIndex((m) => m.sender === "bot");
      if (lastBotIdx === -1) return p;
      const idx = p.length - 1 - lastBotIdx;
      return p.filter((_, i) => i !== idx && i !== idx - 1);
    });
    await doSend(lastUserMessage);
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
          "inset-x-0 bottom-0 h-[60vh] rounded-t-3xl",
          "md:inset-auto md:bottom-6 md:right-6 md:w-[340px] md:h-[80vh] md:min-h-[420px] md:rounded-3xl",
        ].join(" ")}
      >
        {/* Drag handle — mobile only */}
        <div className="md:hidden flex justify-center pt-2.5 pb-1 flex-shrink-0">
          <div className="w-10 h-1 rounded-full bg-[var(--border-strong)]" />
        </div>
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
              {/* PaymentModal para takeaway via chat */}
              {takeawayPayModal && (
                <PaymentModal
                  unpaidInvoices={[{ inv: takeawayPayModal.inv }]}
                  userId={takeawayPayModal.userId}
                  onClose={() => setTakeawayPayModal(null)}
                  onPaid={() => {
                    const { msgId } = takeawayPayModal;
                    setMessages(p => p.map(m => m.id === msgId ? { ...m, pendingPayment: null, paymentDone: 'Pago' } : m));
                    setTakeawayPayModal(null);
                    triggerTableRefresh();
                  }}
                />
              )}

              {messages.map((msg) => (
                <div key={msg.id}>
                  {(msg.text || msg.menuItems) && (
                    <ChatBubbleUI
                      message={msg}
                      sender={msg.sender}
                      onOrder={handleMenuOrder}
                      onPaymentMethod={(method, invoiceId, amount, tableId) => handlePaymentMethod(msg.id, method, invoiceId, amount, tableId)}
                      onTakeawayPay={(invoiceId, amount) => handleTakeawayPay(msg.id, invoiceId, amount)}
                    />
                  )}
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
