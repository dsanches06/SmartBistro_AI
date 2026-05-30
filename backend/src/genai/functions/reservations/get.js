import { Type } from '@google/genai';
import { BaseFunction } from '../../models/BaseFunctions.js';

class GetReservationFunction extends BaseFunction {
  constructor() {
    super({
      functionName: 'get_reservation',
      description:
        'Consulta reservas na base de dados. ' +
        'Usa reservation_id para uma reserva específica, customer_id para as reservas de um cliente ' +
        '(devolve a activa se existir) ou table_id para as reservas de uma mesa.',
      properties: {
        reservation_id: {
          type: Type.INTEGER,
          description: 'ID da reserva (opcional)',
        },
        customer_id: {
          type: Type.INTEGER,
          description: 'ID do cliente — devolve a reserva activa (Pending/Confirmed) mais próxima (opcional)',
        },
        table_id: {
          type: Type.INTEGER,
          description: 'ID da mesa (opcional)',
        },
      },
      required: [],
    });
  }

  mapValues(args = {}) {
    return {
      reservation_id: args.reservation_id ? this.parseNumber(args.reservation_id, 0) : null,
      customer_id:    args.customer_id    ? this.parseNumber(args.customer_id, 0)    : null,
      table_id:       args.table_id       ? this.parseNumber(args.table_id, 0)       : null,
    };
  }
}

const getReservationFunction = new GetReservationFunction();
export const getReservationFunctionDeclaration = getReservationFunction.getDeclaration();
