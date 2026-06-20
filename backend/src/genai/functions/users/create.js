import { Type } from '../../config/types.js';
import { BaseFunction } from '../../models/BaseFunctions.js';

class CreateUserFunction extends BaseFunction {
  constructor() {
    super({
      functionName: 'create_user',
      description:
        'Regista um novo utilizador na base de dados. ' +
        'Usa apenas quando get_user não encontrar o utilizador.',
      properties: {
        name: {
          type: Type.STRING,
          description: 'Nome completo do utilizador',
        },
        email: {
          type: Type.STRING,
          description: 'Email do utilizador (opcional)',
        },
        phone: {
          type: Type.STRING,
          description: 'Número de telefone do utilizador (opcional)',
        },
        role_id: {
          type: Type.INTEGER,
          description: 'ID do papel (default: 2 = user)',
        },
      },
      required: ['name'],
    });
  }

  mapValues(args = {}) {
    return {
      name:    this.parseString(args.name),
      email:   args.email ? this.parseString(args.email) : null,
      phone:   args.phone ? this.parseString(args.phone) : null,
      role_id: this.parseNumber(args.role_id, 2),
    };
  }
}

const createUserFunction = new CreateUserFunction();
export const createUserFunctionDeclaration = createUserFunction.getDeclaration();
