import { Type } from '@google/genai';
import { BaseFunction } from '../../models/BaseFunctions.js';

class CreateCustomerFunction extends BaseFunction {
  constructor() {
    super({
      functionName: 'create_customer',
      description:
        'Regista um novo cliente na base de dados. ' +
        'Usa apenas quando get_customer não encontrar o cliente.',
      properties: {
        name: {
          type: Type.STRING,
          description: 'Nome completo do cliente',
        },
        email: {
          type: Type.STRING,
          description: 'Email do cliente',
        },
        phone: {
          type: Type.STRING,
          description: 'Número de telefone do cliente',
        },
        gender: {
          type: Type.STRING,
          description: "Género do cliente: 'Male', 'Female' ou 'Other'",
        },
        role_id: {
          type: Type.INTEGER,
          description: 'ID do papel (default: 2 = customer)',
        },
      },
      required: ['name'],
    });
  }

  mapValues(args = {}) {
    return {
      name:    this.parseString(args.name),
      email:   this.parseString(args.email, ''),
      phone:   this.parseString(args.phone, ''),
      gender:  this.parseString(args.gender, 'Other'),
      role_id: this.parseNumber(args.role_id, 2),
    };
  }
}

const createCustomerFunction = new CreateCustomerFunction();
export const createCustomerFunctionDeclaration = createCustomerFunction.getDeclaration();
