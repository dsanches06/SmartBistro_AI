/**
 * Utilitários de cálculo financeiro — funções puras, sem IA
 *
 * Taxas de IVA em Portugal (restauração):
 *   13% — refeições servidas no local (taxa intermédia)  ← default
 *   23% — bebidas alcoólicas, serviços especiais (taxa normal)
 *    6% — produtos essenciais embalados (taxa reduzida)
 */

// ── Taxas IVA Portugal ────────────────────────────────────────────────────────
export const TAX_RATES = {
  NORMAL:      0.23,   // bebidas alcoólicas, outros
  INTERMEDIATE: 0.13,  // refeições no local  ← restauração
  REDUCED:     0.06,   // bens essenciais
};

// Taxa padrão para restauração
export const DEFAULT_TAX_RATE = TAX_RATES.INTERMEDIATE;

// ── Arredondamento monetário ──────────────────────────────────────────────────
// Usa Number.EPSILON para evitar erros de vírgula flutuante (0.1 + 0.2 ≠ 0.3)
export function roundMoney(value) {
  return Math.round((Number(value) + Number.EPSILON) * 100) / 100;
}

// ── Subtotal ──────────────────────────────────────────────────────────────────
// items: [{ price: number, quantity: number }, ...]
export function calculateSubtotal(items = []) {
  const raw = items.reduce((sum, item) => {
    const price = Number(item.price ?? item.unit_price ?? 0);
    const qty   = Number(item.quantity ?? 1);
    return sum + price * qty;
  }, 0);
  return roundMoney(raw);
}

// ── Desconto ──────────────────────────────────────────────────────────────────
// type: 'percent' (0–1)  ou  'fixed' (valor absoluto em €)
export function applyDiscount(subtotal, discount = 0, type = 'percent') {
  const sub  = Number(subtotal);
  const disc = Number(discount);
  if (disc <= 0) return 0;
  if (type === 'fixed')   return roundMoney(Math.min(disc, sub));
  // percent: espera valor 0–1 (ex: 0.10 = 10%)
  return roundMoney(sub * Math.min(disc, 1));
}

// ── IVA ───────────────────────────────────────────────────────────────────────
export function applyTax(taxableAmount, taxRate = DEFAULT_TAX_RATE) {
  return roundMoney(Number(taxableAmount) * Number(taxRate));
}

// ── Pipeline completo ─────────────────────────────────────────────────────────
/**
 * Calcula todos os totais de uma fatura.
 *
 * @param {object} opts
 * @param {Array}  opts.items          - Itens do pedido [{ price, quantity }]
 * @param {number} [opts.taxRate]      - Taxa IVA (default: 0.13)
 * @param {number} [opts.discount]     - Valor do desconto
 * @param {string} [opts.discountType] - 'percent' | 'fixed'
 *
 * @returns {{
 *   subtotal:       number,  // soma bruta dos itens
 *   discountAmount: number,  // valor descontado
 *   taxableAmount:  number,  // base tributável (subtotal − desconto)
 *   taxAmount:      number,  // valor do IVA
 *   total:          number,  // total final a pagar
 *   taxRate:        number,  // taxa aplicada
 * }}
 */
export function calculateInvoiceTotals({
  items        = [],
  taxRate      = DEFAULT_TAX_RATE,
  discount     = 0,
  discountType = 'percent',
} = {}) {
  const subtotal       = calculateSubtotal(items);
  const discountAmount = applyDiscount(subtotal, discount, discountType);
  const taxableAmount  = roundMoney(subtotal - discountAmount);
  const taxAmount      = applyTax(taxableAmount, taxRate);
  const total          = roundMoney(taxableAmount + taxAmount);

  return {
    subtotal,
    discountAmount,
    taxableAmount,
    taxAmount,
    total,
    taxRate,
  };
}

// ── Margem de lucro ───────────────────────────────────────────────────────────
// ingredientsCost: custo real dos ingredientes usados
export function calculateProfitMargin(total, ingredientsCost = 0) {
  return roundMoney(Number(total) - Number(ingredientsCost));
}
