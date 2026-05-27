import { Type } from '@google/genai';
import { BaseFunction } from '../../models/BaseFunctions.js';

class CreateOrderItemFunction extends BaseFunction {
  constructor() {
    super({
      functionName: 'create_order_item',
      description:
        'Adiciona um item a um pedido existente. ' +
        'Chama uma vez por cada item distinto do pedido.',
      properties: {
        order_id: {
          type: Type.INTEGER,
          description: 'ID do pedido ao qual o item pertence',
        },
        item_id: {
          type: Type.INTEGER,
          description: 'ID do item do menu',
        },
        quantity: {
          type: Type.INTEGER,
          description: 'Quantidade solicitada do item (mínimo 1)',
        },
      },
      required: ['order_id', 'item_id', 'quantity'],
    });
  }

  mapValues(args = {}) {
    return {
      order_id: this.parseNumber(args.order_id, 0),
      item_id:  this.parseNumber(args.item_id, 0),
      quantity: Math.max(1, this.parseNumber(args.quantity, 1)),
    };
  }
}

const createOrderItemFunction = new CreateOrderItemFunction();
export const createOrderItemFunctionDeclaration = createOrderItemFunction.getDeclaration();
export const functionDeclarations = [createOrderItemFunctionDeclaration];
export const createOrderItem = createOrderItemFunction.execute.bind(createOrderItemFunction);
