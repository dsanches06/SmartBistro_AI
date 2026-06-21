import { Type } from '../../config/types.js';
import { BaseFunction } from '../../models/BaseFunctions.js';

// Ferramenta do chatbot para consultar o saldo de pontos de um cliente.
class GetCustomerPointsFunction extends BaseFunction {
  constructor() {
    super({
      functionName: 'get_customer_points',
      description:
        'Consulta o saldo de pontos de fidelidade de um cliente. ' +
        'Usa antes de criar o pagamento se o cliente tiver user_id.',
      properties: {
        user_id: {
          type: Type.INTEGER,
          description: 'ID do utilizador cujo saldo de pontos se quer consultar',
        },
      },
      required: ['user_id'],
    });
  }

  mapValues(args = {}) {
    return { user_id: this.parseNumber(args.user_id, 0) };
  }
}

const fn = new GetCustomerPointsFunction();
export const getCustomerPointsFunctionDeclaration = fn.getDeclaration();
