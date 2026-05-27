import { Type } from '@google/genai';
import { BaseFunction } from '../../models/BaseFunctions.js';

class GetCustomerFunction extends BaseFunction {
  constructor() {
    super({
      functionName: 'get_customer',
      description:
        'Consulta um cliente existente por ID, email ou telefone. ' +
        'Usa para verificar se o cliente já está registado antes de criar um novo.',
      properties: {
        customer_id: {
          type: Type.INTEGER,
          description: 'ID do cliente (opcional)',
        },
        email: {
          type: Type.STRING,
          description: 'Email do cliente (opcional)',
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
      email:       args.email       ? this.parseString(args.email)          : null,
      phone:       args.phone       ? this.parseString(args.phone)          : null,
    };
  }
}

const getCustomerFunction = new GetCustomerFunction();
export const getCustomerFunctionDeclaration = getCustomerFunction.getDeclaration();
export const functionDeclarations = [getCustomerFunctionDeclaration];
export const getCustomer = getCustomerFunction.execute.bind(getCustomerFunction);
