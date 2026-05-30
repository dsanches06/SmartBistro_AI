import { MENU_CATEGORY_META, formatMenuPrice, getItemEmoji } from "@/utils";

/* ── MenuCardChat ── card de item no chat ── */
function MenuCardChat({ item, onOrder }) {
  const meta  = MENU_CATEGORY_META[item.category] ?? {};
  const emoji = getItemEmoji(item.name);
  return (
    <div
      className="flex-shrink-0 rounded-xl p-3 flex flex-col gap-1.5 w-36"
      style={{
        background: "var(--surface)",
        border: `1px solid ${meta.accent ?? "var(--border)"}30`,
        opacity: item.is_active === false ? 0.5 : 1,
      }}
    >
      <span style={{ fontSize: 22 }}>{emoji}</span>
      <p className="text-xs font-semibold leading-tight" style={{ color: "var(--text)" }}>
        {item.name}
      </p>
      <p className="text-xs font-bold" style={{ color: meta.accent }}>
        {formatMenuPrice(item.price)}
      </p>
      {item.is_active !== false && (
        <button
          onClick={() => onOrder(item.name)}
          className="mt-auto rounded-lg px-2 py-1 text-[10px] font-bold text-white transition-opacity hover:opacity-90"
          style={{ background: "var(--primary)" }}
        >
          + Pedir
        </button>
      )}
      {item.is_active === false && (
        <span className="text-[10px] text-center" style={{ color: "#ef4444" }}>Indisponível</span>
      )}
    </div>
  );
}

/* ── MenuCardsMessage ── mensagem especial com cards do menu ── */
function MenuCardsMessage({ items, onOrder }) {
  const categories = Object.keys(MENU_CATEGORY_META);
  const grouped    = categories.reduce((acc, cat) => {
    const catItems = items.filter(i => i.category === cat);
    if (catItems.length > 0) acc[cat] = catItems;
    return acc;
  }, {});

  return (
    <div className="space-y-3 mt-2">
      {Object.entries(grouped).map(([cat, catItems]) => {
        const meta = MENU_CATEGORY_META[cat];
        return (
          <div key={cat}>
            <p className="text-[10px] font-bold uppercase tracking-wider mb-1.5"
              style={{ color: meta.accent }}>
              {meta.emoji} {meta.label}
            </p>
            <div
              className="flex gap-2 overflow-x-auto pb-1"
              style={{ scrollbarWidth: "none" }}
            >
              {catItems.map(item => (
                <MenuCardChat key={item.id} item={item} onOrder={onOrder} />
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

/**
 * ChatBubbleUI — renderiza uma bolha de mensagem.
 * Suporta: texto, functionResults, badge Concluído e cards de menu interativos.
 */
export function ChatBubbleUI({ message, sender, onOrder }) {
  const isBot = sender !== "user";

  return (
    <div className={`flex ${isBot ? "justify-start" : "justify-end"} animate-fadeIn`}>
      <div
        className={`px-4 py-3 rounded-lg ${
          isBot
            ? "bg-surface-3 text-secondary rounded-bl-none"
            : "bg-[var(--primary)] text-white rounded-br-none"
        }`}
        style={{ maxWidth: message.menuItems ? "100%" : undefined }}
      >
        {/* Texto normal */}
        {message.text && (
          <p className="text-sm whitespace-pre-wrap max-w-xs">{message.text}</p>
        )}

        {/* Cards de menu interativos */}
        {message.menuItems?.length > 0 && (
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
