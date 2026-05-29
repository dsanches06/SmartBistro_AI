import { useTheme } from "@/context/ThemeContext";
import { STATUS_CONFIG, getFormatFromCapacity, getChairPositions, getChairClass } from "@/utils/tablePageUtils";

const formatTableLabel = (number) => `${String(number).padStart(2, "0")}`;

export function TableCard({ mesa, isSelected, onSelect }) {
  const { theme } = useTheme();
  const config = STATUS_CONFIG[mesa.status] ?? STATUS_CONFIG.Available;
  const formato = getFormatFromCapacity(mesa.capacity ?? 4);
  const cadeiraPosicoes = getChairPositions(mesa.capacity ?? 4);
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
        <div className={`flex flex-col items-center justify-center gap-1 border-2 ${formatoClasse} ${config.mesa}`}>
          <span className="text-sm font-bold">{formatTableLabel(mesa.table_number)}</span>
        </div>
        {cadeiraPosicoes.map((position, index) => (
          <div
            key={index}
            className={`absolute bg-transparent border-2 ${config.cadeira} ${getChairClass(position)}`}
          />
        ))}
      </div>
    </button>
  );
}
