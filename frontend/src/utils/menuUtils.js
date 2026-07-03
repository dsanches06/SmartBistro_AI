// Utilitários e constantes do Menu

export const ALL_KEY = "all";

export const MENU_PAGE_SIZE = 10;

// Chart.js category colors (usados em ClientesPage e ProfilePage)
export const CAT_COLORS = {
  "Appetizer":   { bg: "rgba(245,158,11,0.7)",  border: "#F59E0B" },
  "Main Course": { bg: "rgba(59,130,246,0.7)",  border: "#3B82F6" },
  "Dessert":     { bg: "rgba(236,72,153,0.7)",  border: "#EC4899" },
  "Beverage":    { bg: "rgba(16,185,129,0.7)",  border: "#10B981" },
};
export const CAT_FALLBACK = { bg: "rgba(107,114,128,0.7)", border: "#6B7280" };

export const MENU_CATEGORY_META = {
  Appetizer:    { label: "Entradas",          emoji: "🥗", accent: "#22c55e", bg: "#f0fdf4", bgDark: "rgba(34,197,94,0.1)" },
  "Main Course": { label: "Pratos Principais", emoji: "🍽️", accent: "#f59e0b", bg: "#fffbeb", bgDark: "rgba(245,158,11,0.1)" },
  Dessert:      { label: "Sobremesas",         emoji: "🍰", accent: "#ec4899", bg: "#fdf4ff", bgDark: "rgba(236,72,153,0.1)" },
  Beverage:     { label: "Bebidas",            emoji: "🥤", accent: "#3b82f6", bg: "#eff6ff", bgDark: "rgba(59,130,246,0.1)" },
};

export const MENU_CATEGORIES = Object.entries(MENU_CATEGORY_META).map(([key, val]) => ({ key, ...val }));

const ITEM_EMOJI_MAP = [
  { keys: ["fries", "batata frita", "batatas fritas", "chips"], emoji: "🍟" },
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

// Quantas unidades de um item ainda podem ser preparadas com o stock actual.
// Sem ficha técnica associada → assume disponível (Infinity), tal como no backend
// (ver checkStockForKitchenItems em orderController.js).
export function getMaxAvailableQty(itemId, recipeItems, stockByIngredient) {
  const recipe = recipeItems.filter(r => r.item_id === itemId);
  if (!recipe.length) return Infinity;
  return recipe.reduce((max, r) => {
    const available = Number(stockByIngredient.get(r.ingredient_id) ?? 0);
    const required  = Number(r.required_quantity) || 1;
    return Math.min(max, Math.floor(available / required));
  }, Infinity);
}
