import { Type } from '@google/genai';
import { BaseFunction } from '../../models/BaseFunctions.js';

class GetTableFunction extends BaseFunction {
  constructor() {
    super({
      functionName: 'get_table',
      description:
        'Consulta mesas do restaurante. Pode pesquisar por ID, número, estado e/ou capacidade mínima. ' +
        'Para encontrar uma mesa disponível para N pessoas, passa status="Available" e min_capacity=N. ' +
        'Usa para verificar o estado (Available / Occupied / Reserved) antes de aceitar um pedido.',
      properties: {
        table_id: {
          type: Type.INTEGER,
          description: 'ID interno da mesa (opcional)',
        },
        table_number: {
          type: Type.STRING,
          description: 'Número visível da mesa no restaurante, ex: "T01" (opcional)',
        },
        status: {
          type: Type.STRING,
          description: 'Filtrar por estado: Available | Occupied | Reserved (opcional)',
        },
        min_capacity: {
          type: Type.INTEGER,
          description: 'Capacidade mínima de lugares necessária (opcional). Ex: 1 para uma pessoa.',
        },
      },
      required: [],
    });
  }

  mapValues(args = {}) {
    return {
      table_id:     args.table_id     ? this.parseNumber(args.table_id, 0)     : null,
      table_number: args.table_number ? this.parseString(args.table_number, '') : null,
      status:       args.status       ? this.parseString(args.status, '')       : null,
      min_capacity: args.min_capacity ? this.parseNumber(args.min_capacity, 0)  : null,
    };
  }
}

const getTableFunction = new GetTableFunction();
export const getTableFunctionDeclaration = getTableFunction.getDeclaration();
