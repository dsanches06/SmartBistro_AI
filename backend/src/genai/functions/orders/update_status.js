import { Type } from '@google/genai';
import { BaseFunction } from '../../models/BaseFunctions.js';

class UpdateOrderStatusFunction extends BaseFunction {
  constructor() {
    super({
      functionName: 'update_order_status',
      description:
        'Actualiza o estado de um pedido existente. ' +
        "Estados: 'Pending' → 'In Preparation' → 'Ready' → 'Done' → 'Delivered'. Pode ir directo a 'Cancelled'.",
      properties: {
        order_id: {
          type: Type.INTEGER,
          description: 'ID do pedido a actualizar',
        },
        order_status: {
          type: Type.STRING,
          description:
            "Novo estado: 'Pending' | 'In Preparation' | 'Ready' | 'Done' | 'Delivered' | 'Cancelled'",
        },
      },
      required: ['order_id', 'order_status'],
    });
  }

  mapValues(args = {}) {
    const STATUS_MAP = {
      'pendente':           'Pending',
      'pending in kitchen': 'Pending',
      'em preparação':      'In Preparation',
      'in preparation':     'In Preparation',
      'a preparar':         'In Preparation',
      'pronto':             'Ready',
      'ready':              'Ready',
      'concluído':          'Done',
      'done':               'Done',
      'feito':              'Done',
      'entregue':           'Delivered',
      'delivered':          'Delivered',
      'cancelado':          'Cancelled',
      'cancelled':          'Cancelled',
    };
    const raw = this.parseString(args.order_status, 'Pending');
    return {
      order_id:     this.parseNumber(args.order_id, 0),
      order_status: STATUS_MAP[raw.toLowerCase()] ?? raw,
    };
  }
}

const updateOrderStatusFunction = new UpdateOrderStatusFunction();
export const updateOrderStatusFunctionDeclaration = updateOrderStatusFunction.getDeclaration();
