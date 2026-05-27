import { Type } from '@google/genai';
import { BaseFunction } from '../../models/BaseFunctions.js';

class GetTableFunction extends BaseFunction {
  constructor() {
    super({
      functionName: 'get_table',
      description:
        'Consulta uma mesa pelo ID ou número de mesa. ' +
        'Usa para verificar o estado (Available / Occupied / Reserved) antes de aceitar um pedido.',
      properties: {
        table_id: {
          type: Type.INTEGER,
          description: 'ID interno da mesa (opcional)',
        },
        table_number: {
          type: Type.INTEGER,
          description: 'Número visível da mesa no restaurante (opcional)',
        },
      },
      required: [],
    });
  }

  mapValues(args = {}) {
    return {
      table_id:     args.table_id     ? this.parseNumber(args.table_id, 0)     : null,
      table_number: args.table_number ? this.parseNumber(args.table_number, 0) : null,
    };
  }
}

const getTableFunction = new GetTableFunction();
export const getTableFunctionDeclaration = getTableFunction.getDeclaration();
