import { useState } from "react";
import { MENU_CATEGORY_META, formatMenuPrice, getItemEmoji } from "@/utils";

/* ── MenuCardChat ── card seleccionável ── */
function MenuCardChat({ item, selected, onToggle }) {
  const meta  = MENU_CATEGORY_META[item.category] ?? {};
  const emoji = getItemEmoji(item.name);
  const unavailable = item.is_active === false;
  return (
    <div
      onClick={() => !unavailable && onToggle()}
      className="rounded-xl p-3 flex flex-col gap-1.5 w-full cursor-pointer transition-all"
      style={{
        background: selected ? `${meta.accent ?? "var(--primary)"}22` : "var(--surface)",
        border: `1.5px solid ${selected ? (meta.accent ?? "var(--primary)") : `${meta.accent ?? "var(--border)"}30`}`,
        opacity: unavailable ? 0.5 : 1,
      }}
    >
      <span style={{ fontSize: 22 }}>{emoji}</span>
      <p className="text-xs font-semibold leading-tight" style={{ color: "var(--text)" }}>
        {item.name}
      </p>
      <p className="text-xs font-bold" style={{ color: meta.accent }}>
        {formatMenuPrice(item.price)}
      </p>
      {unavailable
        ? <span className="text-[10px] text-center" style={{ color: "#ef4444" }}>Indisponível</span>
        : <span className="text-[10px] font-bold mt-auto text-center py-0.5 rounded-md"
            style={{ background: selected ? (meta.accent ?? "var(--primary)") : "transparent",
                     color: selected ? "#fff" : "var(--text-secondary)" }}>
            {selected ? "✓ Seleccionado" : "+ Pedir"}
          </span>
      }
    </div>
  );
}

/* ── MenuCardsMessage ── grelha com multi-select e botão confirmar ── */
function MenuCardsMessage({ items, onOrder }) {
  const [selected, setSelected] = useState([]);

  const toggle = (item) =>
    setSelected(prev =>
      prev.some(s => s.id === item.id)
        ? prev.filter(s => s.id !== item.id)
        : [...prev, item]
    );

  const confirm = () => {
    if (!selected.length) return;
    onOrder(selected.map(i => i.name).join(", "));
    setSelected([]);
  };

  const categories = Object.keys(MENU_CATEGORY_META);
  const grouped    = categories.reduce((acc, cat) => {
    const catItems = items.filter(i => i.category === cat);
    if (catItems.length > 0) acc[cat] = catItems;
    return acc;
  }, {});

  return (
    <div className="space-y-3 mt-2 w-full">
      {Object.entries(grouped).map(([cat, catItems]) => {
        const meta = MENU_CATEGORY_META[cat];
        return (
          <div key={cat} className="w-full">
            <p className="text-[10px] font-bold uppercase tracking-wider mb-1.5"
              style={{ color: meta.accent }}>
              {meta.emoji} {meta.label}
            </p>
            <div className="grid grid-cols-2 gap-2 w-full">
              {catItems.map(item => (
                <MenuCardChat
                  key={item.id}
                  item={item}
                  selected={selected.some(s => s.id === item.id)}
                  onToggle={() => toggle(item)}
                />
              ))}
            </div>
          </div>
        );
      })}

      {selected.length > 0 && (
        <button
          onClick={confirm}
          className="w-full py-2 rounded-xl text-sm font-bold text-white transition-opacity hover:opacity-90 mt-1"
          style={{ background: "var(--primary)" }}
        >
          Confirmar {selected.length} {selected.length === 1 ? "item" : "itens"}
        </button>
      )}
    </div>
  );
}

/**
 * ChatBubbleUI — renderiza uma bolha de mensagem.
 * Suporta: texto, functionResults, badge Concluído e cards de menu interativos.
 */
const PAYMENT_METHODS = [
  { value: 'Cash',        label: '💵 Dinheiro' },
  { value: 'MB Way',      label: '📱 MB Way'   },
  { value: 'Credit Card', label: '💳 Cartão'   },
  { value: 'Multibanco',  label: '🏧 Multibanco' },
];

export function ChatBubbleUI({ message, sender, onOrder, onPaymentMethod, onTakeawayPay }) {
  const isBot    = sender !== "user";
  const hasMenu  = (message.menuItems?.length ?? 0) > 0;

  return (
    <div className={`flex ${isBot ? "justify-start" : "justify-end"} animate-fadeIn`}>
      <div
        className={`px-4 py-3 rounded-lg ${
          isBot
            ? "bg-surface-3 text-secondary rounded-bl-none"
            : "bg-[var(--primary)] text-white rounded-br-none"
        } ${hasMenu ? "w-full" : "max-w-xs"}`}
      >
        {/* Texto normal */}
        {message.text && (
          <p className="text-sm whitespace-pre-wrap">{message.text}</p>
        )}

        {/* Cards de menu interativos */}
        {hasMenu && (
          <MenuCardsMessage items={message.menuItems} onOrder={onOrder ?? (() => {})} />
        )}

        {/* Function results */}
        {message.functionResults?.length > 0 && !message.persistenceErrors?.length && !message.text && !message.menuItems && (
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

        {/* Botões de método de pagamento (mesa/dine-in) */}
        {message.pendingPayment && !message.pendingPayment.isTakeaway && onPaymentMethod && (
          <div className="mt-3 flex flex-col gap-2">
            <p className="text-xs font-semibold" style={{ color: "var(--text-secondary)" }}>
              Como deseja pagar? ({message.pendingPayment.amount.toFixed(2)} €)
            </p>
            <div className="grid grid-cols-2 gap-1.5">
              {PAYMENT_METHODS.map(({ value, label }) => (
                <button key={value}
                  onClick={() => onPaymentMethod(value, message.pendingPayment.invoice_id, message.pendingPayment.amount, message.pendingPayment.tableId)}
                  className="py-2 px-3 rounded-xl text-xs font-semibold text-left transition-colors hover:opacity-80"
                  style={{ background: "var(--primary)", color: "#fff" }}>
                  {label}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Takeaway via chat — abre PaymentModal */}
        {message.pendingPayment?.isTakeaway && onTakeawayPay && (
          <div className="mt-3">
            <button
              onClick={() => onTakeawayPay(message.pendingPayment.invoice_id, message.pendingPayment.amount)}
              className="w-full py-2.5 rounded-xl text-sm font-bold text-white"
              style={{ background: "var(--primary)" }}>
              💳 Escolher método de pagamento ({message.pendingPayment.amount.toFixed(2)} €)
            </button>
          </div>
        )}

        {/* Pagamento concluído */}
        {message.paymentDone && (
          <div className="mt-2 flex items-center gap-1.5 text-green-400 text-xs font-semibold">
            <i className="fa-solid fa-circle-check" />
            <span>Pago com {message.paymentDone} ✓</span>
          </div>
        )}

        {/* Badge Concluído */}
        {message.done && (
          <div className="mt-2 flex items-center gap-1.5 text-green-400 text-xs font-semibold">
            <i className="fa-solid fa-circle-check" />
            <span>Concluído</span>
          </div>
        )}

        {/* Timestamp */}
        {message.timestamp && (
          <p className="text-xs mt-1 opacity-70">
            {message.timestamp.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
          </p>
        )}
      </div>
    </div>
  );
}
