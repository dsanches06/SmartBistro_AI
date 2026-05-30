// Utilitários e constantes da página de Stock

export const STOCK_PAGE_SIZE = 12;

/** Limiares de quantidade para determinar o estado do stock */
export const STOCK_THRESHOLDS = { CRITICO: 3, BAIXO: 10 };

export const STOCK_STATUS_META = {
  OK:      { label: 'OK',       bg: '#f0fdf4', color: '#22c55e', text: '#166534' },
  Baixo:   { label: 'Baixo',    bg: '#fff7ed', color: '#f97316', text: '#9a3412' },
  Critico: { label: 'Crítico',  bg: '#fef2f2', color: '#ef4444', text: '#991b1b' },
};

/** Deriva o estado (OK / Baixo / Crítico) a partir da quantidade */
export function getStockStatus(quantity) {
  const q = Number(quantity);
  if (q < STOCK_THRESHOLDS.CRITICO) return 'Critico';
  if (q < STOCK_THRESHOLDS.BAIXO)   return 'Baixo';
  return 'OK';
}

/** Junta registos de stock com os dados dos ingredientes */
export function mergeStockWithIngredients(stockList, ingredientList) {
  const map = new Map(ingredientList.map(i => [i.id, i]));
  return stockList.map(s => {
    const ing = map.get(s.ingredient_id) ?? {};
    return {
      ...s,
      name:   ing.name             ?? `Ingrediente ${s.ingredient_id}`,
      unit:   ing.measurement_unit ?? '—',
      status: getStockStatus(s.available_quantity),
    };
  });
}

/** Filtra itens de stock por texto (nome, unidade ou estado) */
export function filterStock(items, search = '') {
  const q = search.trim().toLowerCase();
  if (!q) return items;
  return items.filter(i =>
    i.name.toLowerCase().includes(q) ||
    i.unit.toLowerCase().includes(q) ||
    STOCK_STATUS_META[i.status]?.label.toLowerCase().includes(q),
  );
}

/** Formata quantidade com 2 casas decimais, removendo zeros desnecessários */
export function formatQty(value) {
  const n = Number(value);
  return Number.isInteger(n) ? String(n) : n.toFixed(2).replace(/\.?0+$/, '');
}

/* ── Ícones de ingredientes ── */
const EMOJI_MAP = [
  { keys: ['pasta', 'spaghetti', 'noodle', 'massa', 'tagliatelle', 'fettuccine'], emoji: '🍝', bg: '#fee2e2' },
  { keys: ['beef', 'steak', 'vaca', 'bife', 'minced', 'picada'],                 emoji: '🥩', bg: '#fecaca' },
  { keys: ['burger', 'bun', 'brioche', 'hamburguer', 'pão'],                     emoji: '🍔', bg: '#fef3c7' },
  { keys: ['chicken', 'frango', 'breast', 'peito'],                              emoji: '🍗', bg: '#fef9c3' },
  { keys: ['salmon', 'salmão', 'tuna', 'atum', 'cod', 'bacalhau',
           'fish', 'peixe', 'fillet', 'filete'],                                  emoji: '🐟', bg: '#dbeafe' },
  { keys: ['shrimp', 'camarão', 'prawn', 'squid', 'lula'],                       emoji: '🦐', bg: '#fce7f3' },
  { keys: ['cheese', 'queijo', 'mozzarella', 'brie', 'cheddar'],                 emoji: '🧀', bg: '#fef3c7' },
  { keys: ['tomato', 'tomate'],                                                   emoji: '🍅', bg: '#fee2e2' },
  { keys: ['rice', 'arroz'],                                                      emoji: '🌾', bg: '#fef9c3' },
  { keys: ['potato', 'batata'],                                                   emoji: '🥔', bg: '#fef3c7' },
  { keys: ['lettuce', 'salada', 'salad', 'alface'],                              emoji: '🥗', bg: '#dcfce7' },
  { keys: ['vegetable', 'vegetal', 'mixed veg', 'legume',
           'broccoli', 'brócolos', 'courgette'],                                  emoji: '🥦', bg: '#dcfce7' },
  { keys: ['mushroom', 'cogumelo'],                                               emoji: '🍄', bg: '#f5f5f4' },
  { keys: ['onion', 'cebola', 'garlic', 'alho'],                                 emoji: '🧅', bg: '#fef9c3' },
  { keys: ['pepper', 'pimento', 'chili', 'piri'],                                emoji: '🫑', bg: '#dcfce7' },
  { keys: ['lemon', 'limão', 'lime'],                                             emoji: '🍋', bg: '#fef9c3' },
  { keys: ['egg', 'ovo'],                                                         emoji: '🥚', bg: '#fef9c3' },
  { keys: ['milk', 'leite', 'cream', 'natas', 'butter', 'manteiga'],             emoji: '🥛', bg: '#f1f5f9' },
  { keys: ['flour', 'farinha'],                                                   emoji: '🌾', bg: '#fef3c7' },
  { keys: ['sugar', 'açúcar'],                                                   emoji: '🍬', bg: '#fce7f3' },
  { keys: ['oil', 'azeite', 'olive'],                                             emoji: '🫒', bg: '#dcfce7' },
  { keys: ['sauce', 'molho', 'ketchup', 'mayo', 'mustard', 'mostarda'],          emoji: '🫙', bg: '#fed7aa' },
  { keys: ['coffee', 'café', 'bean', 'espresso'],                                emoji: '☕', bg: '#d6d3d1' },
  { keys: ['cola', 'coke', 'coca'],                                               emoji: '🥤', bg: '#fee2e2' },
  { keys: ['beer', 'cerveja', 'lager', 'sagres', 'super bock'],                  emoji: '🍺', bg: '#fef3c7' },
  { keys: ['wine', 'vinho'],                                                      emoji: '🍷', bg: '#fce7f3' },
  { keys: ['juice', 'sumo', 'sumol', 'orange', 'laranja'],                       emoji: '🧃', bg: '#fef9c3' },
  { keys: ['water', 'água', 'sparkling'],                                         emoji: '💧', bg: '#dbeafe' },
  { keys: ['chocolate', 'cocoa', 'cacau'],                                        emoji: '🍫', bg: '#d6d3d1' },
  { keys: ['bread', 'pão', 'baguette'],                                           emoji: '🍞', bg: '#fef3c7' },
];

/**
 * Devolve `{ emoji, bg }` com base em keywords no nome do ingrediente.
 * Fallback: caixa genérica.
 */
export function getIngredientEmoji(name = '') {
  const lower = name.toLowerCase();
  for (const { keys, emoji, bg } of EMOJI_MAP) {
    if (keys.some(k => lower.includes(k))) return { emoji, bg };
  }
  return { emoji: '📦', bg: '#f3f4f6' };
}
