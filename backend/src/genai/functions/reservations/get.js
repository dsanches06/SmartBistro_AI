import { Type } from '../../config/types.js';
import { BaseFunction } from '../../models/BaseFunctions.js';

class GetReservationFunction extends BaseFunction {
  constructor() {
    super({
      functionName: 'get_reservation',
      description:
        'Consulta reservas na base de dados. ' +
        'Usa reservation_id para uma reserva específica, user_id para as reservas de um utilizador ' +
        '(devolve a activa se existir) ou table_id para as reservas de uma mesa.',
      properties: {
        reservation_id: {
          type: Type.INTEGER,
          description: 'ID da reserva (opcional)',
        },
        user_id: {
          type: Type.INTEGER,
          description: 'ID do utilizador — devolve a reserva activa (Pending/Confirmed) mais próxima (opcional)',
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
      user_id:        args.user_id        ? this.parseNumber(args.user_id, 0)        : null,
      table_id:       args.table_id       ? this.parseNumber(args.table_id, 0)       : null,
    };
  }
}

const getReservationFunction = new GetReservationFunction();
export const getReservationFunctionDeclaration = getReservationFunction.getDeclaration();
