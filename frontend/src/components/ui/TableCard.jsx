import { useTheme } from "@/context/ThemeContext";
import { STATUS_CONFIG, getFormatFromCapacity, getChairPositions, getChairClass } from "@/utils/tablePageUtils";

/** table_number pode vir como 'T13' ou 13 — normaliza para 'T13' */
const fmtLabel = (n) => {
  const raw = String(n).replace(/^[Tt]/, "");
  return `T${raw.padStart(2, "0")}`;
};

export function TableCard({ mesa, isSelected, onSelect, occupancy }) {
  useTheme();
  const config          = STATUS_CONFIG[mesa.status] ?? STATUS_CONFIG.Available;
  const formato         = getFormatFromCapacity(mesa.capacity ?? 4);
  const isOccupied      = mesa.status === "Occupied";
  const emojis          = occupancy?.emojis ?? [];
  const label           = fmtLabel(mesa.table_number);

  // Cadeiras: pintadas apenas quando Occupied, quantidade = capacity
  const totalChairs  = mesa.capacity ?? 4;
  const allPositions = getChairPositions(totalChairs);

  const formatoClasse =
    formato === "redonda"
      ? "rounded-full w-12 h-12"
      : formato === "retangular"
      ? "rounded-[10px] w-14 h-11"
      : "rounded-[10px] w-12 h-12";

  return (
    <button
      type="button"
      onClick={onSelect}
      className={`rounded-[7px] p-2 text-[var(--text)] transition shadow-sm hover:shadow-md ${
        isSelected
          ? "ring-2 ring-[var(--primary)] bg-[var(--surface-2)]"
          : "bg-transparent"
      }`}
    >
      <div className="relative flex h-[72px] w-[72px] items-center justify-center">

        {/* Mesa */}
        <div className={`flex flex-col items-center justify-center border-2 ${formatoClasse} ${config.mesa}`}>
          {isOccupied ? (
            <div className="flex flex-wrap items-center justify-center leading-none" style={{ fontSize: 11 }}>
              {emojis.length > 0
                ? emojis.slice(0, 4).map((e, i) => <span key={i}>{e}</span>)
                : <span>🍽️</span>
              }
            </div>
          ) : (
            <span className="text-xs font-bold">{label}</span>
          )}
        </div>

        {/* Cadeiras — hollow (livre/reservada) ou preenchidas (ocupada) */}
        {allPositions.map((pos, i) => (
          <div
            key={i}
            className={`absolute border-2 ${config.cadeira} ${getChairClass(pos)}`}
          />
        ))}

        {/* Badge pessoas — só quando ocupada */}
        {isOccupied && (
          <div
            className="absolute bottom-0 right-0 flex items-center gap-0.5 rounded-full px-1 py-0.5"
            style={{ background: "#f97316", fontSize: 8, color: "#fff", fontWeight: 700, lineHeight: 1 }}
          >
            <span>👥</span>
            <span>{totalChairs}</span>
          </div>
        )}

      </div>

      {/* Label abaixo */}
      <p className="mt-0.5 text-center text-[10px] font-semibold" style={{ color: "var(--text-secondary)" }}>
        {label}
      </p>
    </button>
  );
}
