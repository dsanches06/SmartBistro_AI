// Utilitários e constantes da página de Menu

export const MENU_CATEGORY_META = {
  Appetizer:    { label: "Entradas",          emoji: "🥗", accent: "#22c55e", bg: "#f0fdf4", bgDark: "rgba(34,197,94,0.1)" },
  "Main Course": { label: "Pratos Principais", emoji: "🍽️", accent: "#f59e0b", bg: "#fffbeb", bgDark: "rgba(245,158,11,0.1)" },
  Dessert:      { label: "Sobremesas",         emoji: "🍰", accent: "#ec4899", bg: "#fdf4ff", bgDark: "rgba(236,72,153,0.1)" },
  Beverage:     { label: "Bebidas",            emoji: "🥤", accent: "#3b82f6", bg: "#eff6ff", bgDark: "rgba(59,130,246,0.1)" },
};

export const MENU_CATEGORIES = Object.entries(MENU_CATEGORY_META).map(([key, val]) => ({ key, ...val }));

const ITEM_EMOJI_MAP = [
  { keys: ["caesar", "salad", "salada"],                       emoji: "🥗" },
  { keys: ["bruschetta"],                                       emoji: "🍞" },
  { keys: ["soup", "sopa", "creme"],                           emoji: "🍲" },
  { keys: ["wing"],                                             emoji: "🍗" },
  { keys: ["chicken", "frango", "parmigiana"],                 emoji: "🍗" },
  { keys: ["pasta", "esparguete", "bolonhesa", "carbonara"],   emoji: "🍝" },
  { keys: ["burger", "hamburguer"],                            emoji: "🍔" },
  { keys: ["salmon", "salmão"],                                emoji: "🐟" },
  { keys: ["bacalhau", "cod"],                                 emoji: "🐟" },
  { keys: ["steak", "bife", "beef"],                           emoji: "🥩" },
  { keys: ["pizza"],                                           emoji: "🍕" },
  { keys: ["tiramisu"],                                        emoji: "🍮" },
  { keys: ["chocolate", "mousse"],                             emoji: "🍫" },
  { keys: ["cheesecake"],                                      emoji: "🍰" },
  { keys: ["beer", "cerveja", "craft"],                        emoji: "🍺" },
  { keys: ["wine", "vinho"],                                   emoji: "🍷" },
  { keys: ["juice", "sumo", "orange"],                         emoji: "🧃" },
  { keys: ["water", "água", "sparkling"],                      emoji: "💧" },
  { keys: ["coffee", "café"],                                  emoji: "☕" },
  { keys: ["cola", "coke", "coca"],                            emoji: "🥤" },
];

export function getItemEmoji(name = "") {
  const lower = name.toLowerCase();
  for (const { keys, emoji } of ITEM_EMOJI_MAP) {
    if (keys.some(k => lower.includes(k))) return emoji;
  }
  return "🍴";
}

export function formatMenuPrice(price) {
  return `€${Number(price).toFixed(2)}`;
}

export function groupItemsByCategory(items) {
  return Object.keys(MENU_CATEGORY_META).reduce((acc, cat) => {
    acc[cat] = items.filter(i => i.category === cat);
    return acc;
  }, {});
}
