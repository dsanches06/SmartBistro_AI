import { BaseFunction } from '../../models/BaseFunctions.js';

class FindOrCreateUserFunction extends BaseFunction {
  constructor() {
    super({
      functionName: 'find_or_create_user',
      description:
        'Procura um utilizador pelo nome. Se não existir, cria-o e devolve o user_id. ' +
        'Parâmetro name é uma STRING simples: find_or_create_user({ name: "Danilson" }). ' +
        'Usa SEMPRE este em vez de get_user quando tens o nome do utilizador.',
      properties: {
        name: {
          description: 'Nome completo do utilizador. Deve ser uma string simples como "Danilson" ou "Maria Silva".',
        },
        phone: {
          description: 'Telefone do utilizador (opcional).',
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

const findOrCreateUserFunction = new FindOrCreateUserFunction();
export const findOrCreateUserFunctionDeclaration = findOrCreateUserFunction.getDeclaration();
