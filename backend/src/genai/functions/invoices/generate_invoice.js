import { Type } from '../../config/types.js';
import { BaseFunction } from '../../models/BaseFunctions.js';

// Função do chatbot para gerar a fatura de um pedido via CashierAgent.
// Usada apenas quando o cliente pede a conta — Manager calcula os totais.
class GenerateInvoiceFunction extends BaseFunction {
  constructor() {
    super({
      functionName: 'generate_invoice',
      description:
        'Gera a fatura de um pedido usando o CashierAgent para calcular totais. ' +
        'Usa APENAS quando o cliente pede a conta ("conta", "quero pagar", "vou embora"). ' +
        'Devolve invoice_id e total para o frontend mostrar os botões de pagamento.',
      properties: {
        order_id: {
          type: Type.INTEGER,
          description: 'ID do pedido para gerar a fatura',
        },
        discount: {
          type: Type.NUMBER,
          description: 'Desconto em € a aplicar (0 se não houver)',
        },
      },
      required: ['order_id'],
    });
  }

  mapValues(args = {}) {
    return {
      order_id: this.parseNumber(args.order_id, 0),
      discount: this.parseNumber(args.discount, 0),
    };
  }
}

const fn = new GenerateInvoiceFunction();
export const generateInvoiceFunctionDeclaration = fn.getDeclaration();
