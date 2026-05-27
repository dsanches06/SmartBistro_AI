import { Type } from '@google/genai';
import { BaseFunction } from '../../models/BaseFunctions.js';

class UpdateOrderStatusFunction extends BaseFunction {
  constructor() {
    super({
      functionName: 'update_order_status',
      description:
        'Actualiza o estado de um pedido existente. ' +
        "Estados possíveis: 'Pending in Kitchen', 'In Preparation', 'Ready', 'Delivered', 'Cancelled'.",
      properties: {
        order_id: {
          type: Type.INTEGER,
          description: 'ID do pedido a actualizar',
        },
        order_status: {
          type: Type.STRING,
          description:
            "Novo estado do pedido: 'Pending in Kitchen' | 'In Preparation' | 'Ready' | 'Delivered' | 'Cancelled'",
        },
      },
      required: ['order_id', 'order_status'],
    });
  }

  mapValues(args = {}) {
    const STATUS_MAP = {
      'pendente':       'Pending in Kitchen',
      'em preparação':  'In Preparation',
      'pronto':         'Ready',
      'entregue':       'Delivered',
      'cancelado':      'Cancelled',
    };
    const raw = this.parseString(args.order_status, 'Pending in Kitchen');
    return {
      order_id:     this.parseNumber(args.order_id, 0),
      order_status: STATUS_MAP[raw.toLowerCase()] ?? raw,
    };
  }
}

const updateOrderStatusFunction = new UpdateOrderStatusFunction();
export const updateOrderStatusFunctionDeclaration = updateOrderStatusFunction.getDeclaration();
export const functionDeclarations = [updateOrderStatusFunctionDeclaration];
export const updateOrderStatus = updateOrderStatusFunction.execute.bind(updateOrderStatusFunction);
