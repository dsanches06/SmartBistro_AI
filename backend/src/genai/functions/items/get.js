import { Type } from '@google/genai';
import { BaseFunction } from '../../models/BaseFunctions.js';

class GetItemFunction extends BaseFunction {
  constructor() {
    super({
      functionName: 'get_item',
      description:
        'Consulta um item do menu pelo ID. ' +
        'Usa para verificar se o item existe, está activo (is_active = true) e obter o preço unitário.',
      properties: {
        item_id: {
          type: Type.INTEGER,
          description: 'ID do item do menu a consultar',
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

const getItemFunction = new GetItemFunction();
export const getItemFunctionDeclaration = getItemFunction.getDeclaration();
