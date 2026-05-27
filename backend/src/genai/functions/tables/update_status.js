import { Type } from '@google/genai';
import { BaseFunction } from '../../models/BaseFunctions.js';

class UpdateTableStatusFunction extends BaseFunction {
  constructor() {
    super({
      functionName: 'update_table_status',
      description:
        "Actualiza o estado de uma mesa. O Chefe usa para marcar a mesa como 'Occupied' após confirmar o pedido.",
      properties: {
        table_id: {
          type: Type.INTEGER,
          description: 'ID da mesa a actualizar',
        },
        status: {
          type: Type.STRING,
          description: "Novo estado: 'Available' | 'Occupied' | 'Reserved'",
        },
      },
      required: ['table_id', 'status'],
    });
  }

  mapValues(args = {}) {
    const STATUS_MAP = {
      'disponível': 'Available',
      'ocupada':    'Occupied',
      'reservada':  'Reserved',
    };
    const raw = this.parseString(args.status, 'Available');
    return {
      table_id: this.parseNumber(args.table_id, 0),
      status:   STATUS_MAP[raw.toLowerCase()] ?? raw,
    };
  }
}

const updateTableStatusFunction = new UpdateTableStatusFunction();
export const updateTableStatusFunctionDeclaration = updateTableStatusFunction.getDeclaration();
export const functionDeclarations = [updateTableStatusFunctionDeclaration];
export const updateTableStatus = updateTableStatusFunction.execute.bind(updateTableStatusFunction);
