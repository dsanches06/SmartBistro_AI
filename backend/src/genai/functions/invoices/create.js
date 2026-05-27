import { Type } from '@google/genai';
import { BaseFunction } from '../../models/BaseFunctions.js';

class CreateInvoiceFunction extends BaseFunction {
  constructor() {
    super({
      functionName: 'create_invoice',
      description:
        'Gera uma fatura para um pedido concluído. Os totais são fornecidos pré-calculados ' +
        '(IVA 13% refeições / 23% bebidas alcoólicas); não recalcules os valores.',
      properties: {
        order_id: {
          type: Type.INTEGER,
          description: 'ID do pedido ao qual a fatura corresponde',
        },
        subtotal_amount: {
          type: Type.NUMBER,
          description: 'Subtotal antes de impostos (Σ price × quantity)',
        },
        tax_amount: {
          type: Type.NUMBER,
          description: 'Valor do IVA (subtotal × 0.23)',
        },
        total_amount: {
          type: Type.NUMBER,
          description: 'Total final (subtotal + tax)',
        },
        profit_margin: {
          type: Type.NUMBER,
          description: 'Margem de lucro (total − custo dos ingredientes)',
        },
      },
      required: ['order_id', 'subtotal_amount', 'tax_amount', 'total_amount', 'profit_margin'],
    });
  }

  mapValues(args = {}) {
    return {
      order_id:        this.parseNumber(args.order_id, 0),
      subtotal_amount: this.parseNumber(args.subtotal_amount, 0),
      tax_amount:      this.parseNumber(args.tax_amount, 0),
      total_amount:    this.parseNumber(args.total_amount, 0),
      profit_margin:   this.parseNumber(args.profit_margin, 0),
    };
  }
}

const createInvoiceFunction = new CreateInvoiceFunction();
export const createInvoiceFunctionDeclaration = createInvoiceFunction.getDeclaration();
