import { Type } from '@google/genai';
import { BaseFunction } from '../../models/BaseFunctions.js';

class CalculateInvoiceTotalsFunction extends BaseFunction {
  constructor() {
    super({
      functionName: 'calculate_invoice_totals',
      description:
        'Calcula o subtotal, IVA e total de um pedido a partir dos seus itens. ' +
        'Chama SEMPRE esta função antes de create_invoice para obter os valores correctos. ' +
        'Não faças cálculos manualmente — usa esta função.',
      properties: {
        order_id: {
          type: Type.INTEGER,
          description: 'ID do pedido cujos totais se pretendem calcular',
        },
        tax_rate: {
          type: Type.NUMBER,
          description:
            'Taxa de IVA a aplicar (ex: 0.13 para 13%). ' +
            'Por omissão usa 0.13 (refeições). Use 0.23 para bebidas alcoólicas.',
        },
      },
      required: ['order_id'],
    });
  }
}

const calculateInvoiceTotalsFunction = new CalculateInvoiceTotalsFunction();
export const calculateInvoiceTotalsFunctionDeclaration =
  calculateInvoiceTotalsFunction.getDeclaration();
