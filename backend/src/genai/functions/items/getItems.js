import { Type } from '@google/genai';
import { BaseFunction } from '../../models/BaseFunctions.js';

class GetItemsFunction extends BaseFunction {
  constructor() {
    super({
      functionName: 'get_items',
      description:
        'Consulta itens do menu usando categoria, pesquisa por nome e ordenação. ' +
        'Use para listar itens em cartões pelo tipo de prato solicitado.',
      properties: {
        category: {
          type: Type.STRING,
          description: 'Categoria do item do menu (por exemplo: Appetizer, Main Course, Beverage, Dessert).',
        },
        search: {
          type: Type.STRING,
          description: 'Termo de pesquisa parcial para o nome do item.',
        },
        sort: {
          type: Type.STRING,
          description: 'Ordenação por nome: asc ou desc.',
        },
      },
      required: [],
    });
  }

  mapValues(args = {}) {
    return {
      category: this.parseString(args.category, ''),
      search: this.parseString(args.search, ''),
      sort: this.parseString(args.sort, ''),
    };
  }
}

const getItemsFunction = new GetItemsFunction();
export const getItemsFunctionDeclaration = getItemsFunction.getDeclaration();
