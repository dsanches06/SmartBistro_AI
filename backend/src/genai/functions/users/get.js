import { Type } from '../../config/types.js';
import { BaseFunction } from '../../models/BaseFunctions.js';

class GetUserFunction extends BaseFunction {
  constructor() {
    super({
      functionName: 'get_user',
      description:
        'Procura um utilizador existente por nome, telefone ou ID. ' +
        'Usa sempre que o utilizador fornecer o nome — passa o nome completo no campo name.',
      properties: {
        user_id: {
          type: Type.INTEGER,
          description: 'ID do utilizador (opcional)',
        },
        name: {
          type: Type.STRING,
          description: 'Nome completo do utilizador (ex: "Danilson Sanches")',
        },
        phone: {
          type: Type.STRING,
          description: 'Telefone do utilizador (opcional)',
        },
      },
      required: [],
    });
  }

  mapValues(args = {}) {
    return {
      user_id: args.user_id ? this.parseNumber(args.user_id, 0) : null,
      name:    args.name    ? this.parseString(args.name)        : null,
      phone:   args.phone   ? this.parseString(args.phone)       : null,
    };
  }
}

const getUserFunction = new GetUserFunction();
export const getUserFunctionDeclaration = getUserFunction.getDeclaration();
