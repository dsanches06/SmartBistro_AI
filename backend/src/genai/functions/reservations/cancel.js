import { Type } from '@google/genai';
import { BaseFunction } from '../../models/BaseFunctions.js';

class CancelReservationFunction extends BaseFunction {
  constructor() {
    super({
      functionName: 'cancel_reservation',
      description:
        'Cancela uma reserva activa e liberta a mesa automaticamente (tudo numa única operação). ' +
        'Não precisas de chamar update_table_status — a mesa fica "Available" de forma automática. ' +
        'Usa quando o cliente pede para cancelar ou em caso de no-show.',
      properties: {
        reservation_id: {
          type: Type.INTEGER,
          description: 'ID da reserva a cancelar',
        },
      },
      required: ['reservation_id'],
    });
  }

  mapValues(args = {}) {
    return {
      reservation_id: this.parseNumber(args.reservation_id, 0),
    };
  }
}

const cancelReservationFunction = new CancelReservationFunction();
export const cancelReservationFunctionDeclaration = cancelReservationFunction.getDeclaration();
