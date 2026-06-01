import { Type } from '@google/genai';
import { BaseFunction } from '../../models/BaseFunctions.js';

class GetCustomerFunction extends BaseFunction {
  constructor() {
    super({
      functionName: 'get_customer',
      description:
        'Procura um cliente existente por nome, telefone ou ID. ' +
        'Usa sempre que o cliente fornecer o nome — passa o nome completo no campo name.',
      properties: {
        customer_id: {
          type: Type.INTEGER,
          description: 'ID do cliente (opcional)',
        },
        name: {
          type: Type.STRING,
          description: 'Nome completo do cliente (ex: "Danilson Sanches")',
        },
        phone: {
          type: Type.STRING,
          description: 'Telefone do cliente (opcional)',
        },
      },
      required: [],
    });
  }

  mapValues(args = {}) {
    return {
      customer_id: args.customer_id ? this.parseNumber(args.customer_id, 0) : null,
      name:        args.name        ? this.parseString(args.name)            : null,
      phone:       args.phone       ? this.parseString(args.phone)           : null,
    };
  }
}

const getCustomerFunction = new GetCustomerFunction();
export const getCustomerFunctionDeclaration = getCustomerFunction.getDeclaration();
