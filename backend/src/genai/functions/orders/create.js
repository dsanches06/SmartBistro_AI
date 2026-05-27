import { Type } from '@google/genai';
import { BaseFunction } from '../../models/BaseFunctions.js';

class CreateOrderFunction extends BaseFunction {
  constructor() {
    super({
      functionName: 'create_order',
      description:
        'Cria um novo pedido na base de dados com os dados validados pelo Maître. ' +
        'Usa após confirmação de cliente, mesa e itens do menu.',
      properties: {
        customer_id: {
          type: Type.INTEGER,
          description: 'ID do cliente que efectua o pedido',
        },
        table_id: {
          type: Type.INTEGER,
          description: 'ID da mesa associada ao pedido',
        },
        service_type: {
          type: Type.STRING,
          description: "Tipo de serviço: 'Dine In', 'Take Away' ou 'Delivery'",
        },
        allergy_restrictions: {
          type: Type.STRING,
          description: 'Restrições alimentares ou alergias do cliente (opcional)',
        },
        kitchen_sequence_json: {
          type: Type.STRING,
          description: 'Sequência de preparação em JSON gerada pelo Chefe',
        },
        order_status: {
          type: Type.STRING,
          description: "Estado inicial do pedido (default: 'Pending in Kitchen')",
        },
      },
      required: ['customer_id', 'table_id', 'service_type'],
    });
  }

  mapValues(args = {}) {
    return {
      customer_id:           this.parseNumber(args.customer_id, 0),
      table_id:              this.parseNumber(args.table_id, 0),
      service_type:          this.parseString(args.service_type, 'Dine In'),
      allergy_restrictions:  this.parseString(args.allergy_restrictions, ''),
      kitchen_sequence_json: this.parseString(args.kitchen_sequence_json, '[]'),
      order_status:          this.parseString(args.order_status, 'Pending in Kitchen'),
    };
  }
}

const createOrderFunction = new CreateOrderFunction();
export const createOrderFunctionDeclaration = createOrderFunction.getDeclaration();
