// ── ProviderErrorCard ───────────────────────────────────────────────────────────
// Mostra um card de erro quando o provider AI não responde
// Usado dentro de ChatUI.jsx

import { ERROR_CONFIG } from "../../utils/providerErrorCardUtils.js";

export function ProviderErrorCard({ errorType = "UNKNOWN", message, onRetry }) {
  const cfg = ERROR_CONFIG[errorType] || ERROR_CONFIG.UNKNOWN;

  return (
    <div
      className="rounded-xl p-3 text-sm"
      style={{
        background:  cfg.bg,
        border:      `1px solid ${cfg.border}`,
        borderLeft:  `3px solid ${cfg.color}`,
      }}
    >
      <div className="flex items-center gap-2 mb-1.5">
        <span className="text-base">{cfg.icon}</span>
        <span className="font-semibold text-xs" style={{ color: cfg.color }}>
          {cfg.title}
        </span>
      </div>

      <p className="text-xs text-gray-600 leading-relaxed mb-2">{message}</p>

      {onRetry && (
        <button
          onClick={onRetry}
          className="text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors"
          style={{
            background: cfg.color,
            color:      "#fff",
          }}
          onMouseEnter={(e) => (e.currentTarget.style.opacity = "0.85")}
          onMouseLeave={(e) => (e.currentTarget.style.opacity = "1")}
        >
          ↺ Tentar novamente
        </button>
      )}
    </div>
  );
}
