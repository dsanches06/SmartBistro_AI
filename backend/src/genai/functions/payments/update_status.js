import { Type } from '@google/genai';
import { BaseFunction } from '../../models/BaseFunctions.js';

class UpdatePaymentStatusFunction extends BaseFunction {
  constructor() {
    super({
      functionName: 'update_payment_status',
      description:
        'Actualiza o estado de um pagamento existente e regista a data/hora de processamento. ' +
        "Estados: 'Pending', 'Completed', 'Failed', 'Refunded'.",
      properties: {
        payment_id: {
          type: Type.INTEGER,
          description: 'ID do pagamento a actualizar',
        },
        payment_status: {
          type: Type.STRING,
          description: "Novo estado: 'Pending' | 'Completed' | 'Failed' | 'Refunded'",
        },
        payment_method: {
          type: Type.STRING,
          description: "Método de pagamento (opcional): 'Cash' | 'Card' | 'MB Way' | 'Online'",
        },
        processed_at: {
          type: Type.STRING,
          description: 'Data/hora de processamento em ISO 8601 (opcional, default: now)',
        },
      },
      required: ['payment_id', 'payment_status'],
    });
  }

  mapValues(args = {}) {
    const STATUS_MAP = {
      'pago':      'Completed',
      'completo':  'Completed',
      'falhado':   'Failed',
      'reembolso': 'Refunded',
      'pendente':  'Pending',
    };
    const raw = this.parseString(args.payment_status, 'Completed');
    return {
      payment_id:     this.parseNumber(args.payment_id, 0),
      payment_status: STATUS_MAP[raw.toLowerCase()] ?? raw,
      ...(args.payment_method && { payment_method: this.parseString(args.payment_method) }),
      processed_at:   this.parseDate(args.processed_at, this.currentDate()),
    };
  }
}

const updatePaymentStatusFunction = new UpdatePaymentStatusFunction();
export const updatePaymentStatusFunctionDeclaration = updatePaymentStatusFunction.getDeclaration();
