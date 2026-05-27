import { Type } from '@google/genai';
import { BaseFunction } from '../../models/BaseFunctions.js';

class AdjustStockFunction extends BaseFunction {
  constructor() {
    super({
      functionName: 'adjust_stock',
      description:
        'Ajusta a quantidade disponível de um ingrediente no stock. ' +
        'Usa delta negativo para descontar ingredientes consumidos no pedido.',
      properties: {
        ingredient_id: {
          type: Type.INTEGER,
          description: 'ID do ingrediente a ajustar',
        },
        delta: {
          type: Type.NUMBER,
          description:
            'Quantidade a adicionar (positivo) ou subtrair (negativo) do stock disponível',
        },
      },
      required: ['ingredient_id', 'delta'],
    });
  }

  mapValues(args = {}) {
    return {
      ingredient_id: this.parseNumber(args.ingredient_id, 0),
      delta:         this.parseNumber(args.delta, 0),
    };
  }
}

const adjustStockFunction = new AdjustStockFunction();
export const adjustStockFunctionDeclaration = adjustStockFunction.getDeclaration();
export const functionDeclarations = [adjustStockFunctionDeclaration];
export const adjustStock = adjustStockFunction.execute.bind(adjustStockFunction);
