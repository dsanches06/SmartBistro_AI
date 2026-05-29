export const STATUS_CONFIG = {
  Available: {
    label: "Livre",
    mesa: "bg-[#bbf7d0] border-[#22c55e] text-[#166534]",
    cadeira: "bg-[#22c55e] border-[#22c55e]",
  },
  Occupied: {
    label: "Ocupada",
    mesa: "bg-[#fed7aa] border-[#f97316] text-[#9a3412]",
    cadeira: "bg-[#f97316] border-[#f97316]",
  },
  Reserved: {
    label: "Reservada",
    mesa: "bg-[#ddd6fe] border-[#8b5cf6] text-[#4338ca]",
    cadeira: "bg-[#8b5cf6] border-[#8b5cf6]",
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
    default:
      return ["topo", "baixo", "esquerda", "direita", "top-esq", "top-dir", "bai-esq", "bai-dir"];
  }
};

export const getChairClass = (position) => {
  const positions = {
    topo: "top-[2px] left-1/2 -translate-x-1/2 w-[12px] h-[8px] border-b-0 rounded-t-[4px]",
    baixo: "bottom-[2px] left-1/2 -translate-x-1/2 w-[12px] h-[8px] border-t-0 rounded-b-[4px]",
    esquerda: "left-[2px] top-1/2 -translate-y-1/2 w-[8px] h-[12px] border-r-0 rounded-l-[4px]",
    direita: "right-[2px] top-1/2 -translate-y-1/2 w-[8px] h-[12px] border-l-0 rounded-r-[4px]",
    "top-esq": "top-[6px] left-[6px] w-[10px] h-[10px] -rotate-[45deg] border-b-0",
    "top-dir": "top-[6px] right-[6px] w-[10px] h-[10px] rotate-[45deg] border-b-0",
    "bai-esq": "bottom-[6px] left-[6px] w-[10px] h-[10px] -rotate-[135deg] border-b-0",
    "bai-dir": "bottom-[6px] right-[6px] w-[10px] h-[10px] rotate-[135deg] border-b-0",
  };
  return positions[position] ?? "";
};
