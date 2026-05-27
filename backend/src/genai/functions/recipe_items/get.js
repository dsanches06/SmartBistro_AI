import { Type } from '@google/genai';
import { BaseFunction } from '../../models/BaseFunctions.js';

class GetRecipeItemsFunction extends BaseFunction {
  constructor() {
    super({
      functionName: 'get_recipe_items',
      description:
        'Devolve todos os ingredientes necessários para preparar um item do menu. ' +
        'O Chefe usa para verificar o stock antes de aceitar o pedido.',
      properties: {
        item_id: {
          type: Type.INTEGER,
          description: 'ID do item do menu cujos ingredientes se pretende consultar',
        },
      },
      required: ['item_id'],
    });
  }

  mapValues(args = {}) {
    return {
      item_id: this.parseNumber(args.item_id, 0),
    };
  }
}

const getRecipeItemsFunction = new GetRecipeItemsFunction();
export const getRecipeItemsFunctionDeclaration = getRecipeItemsFunction.getDeclaration();
export const functionDeclarations = [getRecipeItemsFunctionDeclaration];
export const getRecipeItems = getRecipeItemsFunction.execute.bind(getRecipeItemsFunction);
