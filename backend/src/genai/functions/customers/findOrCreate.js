import { BaseFunction } from '../../models/BaseFunctions.js';

class FindOrCreateCustomerFunction extends BaseFunction {
  constructor() {
    super({
      functionName: 'find_or_create_customer',
      description:
        'Procura um cliente pelo nome. Se não existir, cria-o e devolve o customer_id. ' +
        'Parâmetro name é uma STRING simples: find_or_create_customer({ name: "Danilson" }). ' +
        'Usa SEMPRE este em vez de get_customer quando tens o nome do cliente.',
      properties: {
        name: {
          description: 'Nome completo do cliente. Deve ser uma string simples como "Danilson" ou "Maria Silva".',
        },
      },
      required: ['name'],
    });
  }

  mapValues(args = {}) {
    return {
      name: this.parseString(args.name),
    };
  }
}

const findOrCreateCustomerFunction = new FindOrCreateCustomerFunction();
export const findOrCreateCustomerFunctionDeclaration = findOrCreateCustomerFunction.getDeclaration();
