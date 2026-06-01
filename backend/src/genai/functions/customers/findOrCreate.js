import { Type } from '@google/genai';
import { BaseFunction } from '../../models/BaseFunctions.js';

class FindOrCreateCustomerFunction extends BaseFunction {
  constructor() {
    super({
      functionName: 'find_or_create_customer',
      description:
        'Procura um cliente pelo nome completo ou telefone. ' +
        'Se não existir, cria-o automaticamente e devolve o customer_id. ' +
        'Usa SEMPRE este em vez de get_customer quando tens o nome do cliente.',
      properties: {
        name: {
          type: Type.STRING,
          description: 'Nome completo do cliente (obrigatório)',
        },
        phone: {
          type: Type.STRING,
          description: 'Telefone do cliente (opcional)',
        },
      },
      required: ['name'],
    });
  }

  mapValues(args = {}) {
    return {
      name:  this.parseString(args.name),
      phone: args.phone ? this.parseString(args.phone) : null,
    };
  }
}

const findOrCreateCustomerFunction = new FindOrCreateCustomerFunction();
export const findOrCreateCustomerFunctionDeclaration = findOrCreateCustomerFunction.getDeclaration();
