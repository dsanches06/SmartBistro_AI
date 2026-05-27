import { Type } from '@google/genai';
import { BaseFunction } from '../../models/BaseFunctions.js';

class GetStockFunction extends BaseFunction {
  constructor() {
    super({
      functionName: 'get_stock',
      description:
        'Consulta o stock disponível de um ingrediente pelo seu ID. ' +
        'Usa para verificar se há quantidade suficiente antes de confirmar o pedido.',
      properties: {
        ingredient_id: {
          type: Type.INTEGER,
          description: 'ID do ingrediente cujo stock se pretende consultar',
        },
      },
      required: ['ingredient_id'],
    });
  }

  mapValues(args = {}) {
    return {
      ingredient_id: this.parseNumber(args.ingredient_id, 0),
    };
  }
}

const getStockFunction = new GetStockFunction();
export const getStockFunctionDeclaration = getStockFunction.getDeclaration();
