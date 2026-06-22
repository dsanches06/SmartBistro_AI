export const STATUS_CONFIG = {
  Available: {
    label: "Livre",
    mesa: "bg-[#bbf7d0] border-[#22c55e] text-[#166534]",
    cadeira: "bg-transparent border-[#22c55e]",       // hollow — cadeiras vazias
  },
  Occupied: {
    label: "Ocupada",
    mesa: "bg-[#fed7aa] border-[#f97316] text-[#9a3412]",
    cadeira: "bg-[#f97316] border-[#f97316]",          // preenchidas — ocupadas
  },
  Reserved: {
    label: "Reservada",
    mesa: "bg-[#ddd6fe] border-[#8b5cf6] text-[#4338ca]",
    cadeira: "bg-transparent border-[#8b5cf6]",        // hollow — reservadas mas vazias
  },
};

export const getFormatFromCapacity = (capacity) => {
  if (capacity >= 10) return "retangular";
  if (capacity >= 6) return "quadrada";
  return "redonda";
};

export const getChairPositions = (capacity) => {
  switch (capacity) {
    case 2:
      return ["topo", "baixo"];
    case 3:
      return ["topo", "baixo", "esquerda"];
    case 4:
      return ["topo", "baixo", "esquerda", "direita"];
    case 5:
      return ["topo", "baixo", "esquerda", "direita", "top-esq"];
    case 6:
      return ["topo", "baixo", "top-esq", "top-dir", "bai-esq", "bai-dir"];
    case 7:
      return ["topo", "baixo", "esquerda", "direita", "top-esq", "top-dir", "bai-esq"];
    case 8:
      return ["topo", "baixo", "esquerda", "direita", "top-esq", "top-dir", "bai-esq", "bai-dir"];
    case 9:
      // 3 topo + 3 baixo + 2 esq + 1 dir
      return ["topo", "topo-l", "topo-r", "baixo", "baixo-l", "baixo-r", "esq-t", "esq-b", "dir-t"];
    case 10:
      // 3 topo + 3 baixo + 2 esq + 2 dir
      return ["topo", "topo-l", "topo-r", "baixo", "baixo-l", "baixo-r", "esq-t", "esq-b", "dir-t", "dir-b"];
    case 11:
      // 3 topo + 3 baixo + 3 esq + 2 dir
      return ["topo", "topo-l", "topo-r", "baixo", "baixo-l", "baixo-r", "esq-t", "esq-m", "esq-b", "dir-t", "dir-b"];
    case 12:
      // 3 topo + 3 baixo + 3 esq + 3 dir
      return ["topo", "topo-l", "topo-r", "baixo", "baixo-l", "baixo-r", "esq-t", "esq-m", "esq-b", "dir-t", "dir-m", "dir-b"];
    default:
      // >12: usa layout de 10 (limita visualmente)
      return ["topo", "topo-l", "topo-r", "baixo", "baixo-l", "baixo-r", "esq-t", "esq-b", "dir-t", "dir-b"];
  }
};

export const getChairClass = (position) => {
  const positions = {
    // ── Posições originais (≤8) ────────────────────────────────────────────────
    topo:     "top-[2px] left-1/2 -translate-x-1/2 w-[11px] h-[7px] border-b-0 rounded-t-[4px]",
    baixo:    "bottom-[2px] left-1/2 -translate-x-1/2 w-[11px] h-[7px] border-t-0 rounded-b-[4px]",
    esquerda: "left-[2px] top-1/2 -translate-y-1/2 w-[7px] h-[11px] border-r-0 rounded-l-[4px]",
    direita:  "right-[2px] top-1/2 -translate-y-1/2 w-[7px] h-[11px] border-l-0 rounded-r-[4px]",
    "top-esq": "top-[6px] left-[6px] w-[9px] h-[9px] -rotate-[45deg] border-b-0",
    "top-dir": "top-[6px] right-[6px] w-[9px] h-[9px] rotate-[45deg] border-b-0",
    "bai-esq": "bottom-[6px] left-[6px] w-[9px] h-[9px] -rotate-[135deg] border-b-0",
    "bai-dir": "bottom-[6px] right-[6px] w-[9px] h-[9px] rotate-[135deg] border-b-0",
    // ── Posições extendidas para 9-12 cadeiras ─────────────────────────────────
    // Topo: 3 cadeiras espalhadas
    "topo-l": "top-[2px] left-[12px] w-[10px] h-[7px] border-b-0 rounded-t-[3px]",
    "topo-r": "top-[2px] right-[12px] w-[10px] h-[7px] border-b-0 rounded-t-[3px]",
    // Baixo: 3 cadeiras espalhadas
    "baixo-l": "bottom-[2px] left-[12px] w-[10px] h-[7px] border-t-0 rounded-b-[3px]",
    "baixo-r": "bottom-[2px] right-[12px] w-[10px] h-[7px] border-t-0 rounded-b-[3px]",
    // Esquerda: 2-3 cadeiras (cima / meio / baixo)
    "esq-t": "left-[2px] top-[12px] w-[7px] h-[10px] border-r-0 rounded-l-[3px]",
    "esq-m": "left-[2px] top-1/2 -translate-y-1/2 w-[7px] h-[10px] border-r-0 rounded-l-[3px]",
    "esq-b": "left-[2px] bottom-[12px] w-[7px] h-[10px] border-r-0 rounded-l-[3px]",
    // Direita: 2-3 cadeiras (cima / meio / baixo)
    "dir-t": "right-[2px] top-[12px] w-[7px] h-[10px] border-l-0 rounded-r-[3px]",
    "dir-m": "right-[2px] top-1/2 -translate-y-1/2 w-[7px] h-[10px] border-l-0 rounded-r-[3px]",
    "dir-b": "right-[2px] bottom-[12px] w-[7px] h-[10px] border-l-0 rounded-r-[3px]",
  };
  return positions[position] ?? "";
};
