import { Type } from '../../config/types.js';
import { BaseFunction } from '../../models/BaseFunctions.js';

class CreateOrderFunction extends BaseFunction {
  constructor() {
    super({
      functionName: 'create_order',
      description:
        'Cria um novo pedido na base de dados com os dados validados pelo Maître. ' +
        'Usa após confirmação de cliente, mesa e itens do menu.',
      properties: {
        user_id: {
          type: Type.INTEGER,
          description: 'ID do cliente que efectua o pedido',
        },
        table_id: {
          type: Type.INTEGER,
          description: 'ID da mesa associada ao pedido (null para Takeaway)',
        },
        service_type: {
          type: Type.STRING,
          description: "Tipo de serviço: 'Table' (comer no local) ou 'Takeaway' (para levar)",
        },
        allergy_restrictions: {
          type: Type.STRING,
          description: 'Alergias ou restrições alimentares. Usa string vazia "" se não houver — NUNCA passes null.',
        },
        order_status: {
          type: Type.STRING,
          description: "Estado inicial do pedido (default: 'Pending')",
        },
      },
      required: ['service_type'],
    });
  }

  mapValues(args = {}) {
    return {
      user_id:           args.user_id != null ? this.parseNumber(args.user_id, 0) : null,
      table_id:              this.parseNumber(args.table_id, 0),
      service_type:          this.parseString(args.service_type, 'Dine In'),
      allergy_restrictions:  this.parseString(args.allergy_restrictions, ''),
      kitchen_sequence_json: this.parseString(args.kitchen_sequence_json, '[]'),
      order_status:          this.parseString(args.order_status, 'Pending'),
    };
  }
}

const createOrderFunction = new CreateOrderFunction();
export const createOrderFunctionDeclaration = createOrderFunction.getDeclaration();
