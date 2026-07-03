import { Type } from '../../config/types.js';
import { BaseFunction } from '../../models/BaseFunctions.js';

class GetOrderFunction extends BaseFunction {
  constructor() {
    super({
      functionName: 'get_order',
      description:
        'Consulta pedidos na base de dados para responder sobre o estado de um pedido. ' +
        'Usa order_id para um pedido específico ou user_id para os pedidos de um utilizador ' +
        '(devolve o mais recente).',
      properties: {
        order_id: {
          type: Type.INTEGER,
          description: 'ID do pedido (opcional)',
        },
        user_id: {
          type: Type.INTEGER,
          description: 'ID do utilizador — devolve o pedido mais recente (opcional)',
        },
      },
      required: [],
    });
  }

  mapValues(args = {}) {
    return {
      order_id: args.order_id ? this.parseNumber(args.order_id, 0) : null,
      user_id:  args.user_id  ? this.parseNumber(args.user_id, 0)  : null,
    };
  }
}

const getOrderFunction = new GetOrderFunction();
export const getOrderFunctionDeclaration = getOrderFunction.getDeclaration();
