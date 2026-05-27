import { Type } from '@google/genai';
import { BaseFunction } from '../../models/BaseFunctions.js';

class CreatePaymentFunction extends BaseFunction {
  constructor() {
    super({
      functionName: 'create_payment',
      description:
        'Regista o pagamento de uma fatura. ' +
        "Métodos: 'Cash', 'Card', 'Online'. Estados: 'Paid', 'Pending', 'Refunded'.",
      properties: {
        invoice_id: {
          type: Type.INTEGER,
          description: 'ID da fatura a pagar',
        },
        customer_id: {
          type: Type.INTEGER,
          description: 'ID do cliente que efectua o pagamento',
        },
        amount: {
          type: Type.NUMBER,
          description: 'Valor pago (deve corresponder ao total_amount da fatura)',
        },
        payment_method: {
          type: Type.STRING,
          description: "Método de pagamento: 'Cash' | 'Card' | 'MB Way' | 'Online'",
        },
        payment_status: {
          type: Type.STRING,
          description: "Estado do pagamento: 'Paid' | 'Pending' | 'Refunded'",
        },
      },
      required: ['invoice_id', 'customer_id', 'amount', 'payment_method', 'payment_status'],
    });
  }

  mapValues(args = {}) {
    return {
      invoice_id:     this.parseNumber(args.invoice_id, 0),
      customer_id:    this.parseNumber(args.customer_id, 0),
      amount:         this.parseNumber(args.amount, 0),
      payment_method: this.parseString(args.payment_method, 'MB Way'),
      payment_status: this.parseString(args.payment_status, 'Paid'),
    };
  }
}

const createPaymentFunction = new CreatePaymentFunction();
export const createPaymentFunctionDeclaration = createPaymentFunction.getDeclaration();
export const functionDeclarations = [createPaymentFunctionDeclaration];
export const createPayment = createPaymentFunction.execute.bind(createPaymentFunction);
