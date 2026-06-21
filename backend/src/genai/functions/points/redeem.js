import { Type } from '../../config/types.js';
import { BaseFunction } from '../../models/BaseFunctions.js';

// Ferramenta do chatbot para resgatar pontos e obter o desconto em €.
class RedeemCustomerPointsFunction extends BaseFunction {
  constructor() {
    super({
      functionName: 'redeem_customer_points',
      description:
        'Resgata pontos de fidelidade de um cliente e devolve o desconto em €. ' +
        'Chama APENAS após o cliente confirmar que quer usar pontos. ' +
        'Mínimo: 50 pontos. 1 ponto = €0,10 de desconto.',
      properties: {
        user_id: {
          type: Type.INTEGER,
          description: 'ID do utilizador cujos pontos se vão resgatar',
        },
        points: {
          type: Type.INTEGER,
          description: 'Número de pontos a resgatar (mínimo 50)',
        },
      },
      required: ['user_id', 'points'],
    });
  }

  mapValues(args = {}) {
    return {
      user_id: this.parseNumber(args.user_id, 0),
      points:  this.parseNumber(args.points, 0),
    };
  }
}

const fn = new RedeemCustomerPointsFunction();
export const redeemCustomerPointsFunctionDeclaration = fn.getDeclaration();
