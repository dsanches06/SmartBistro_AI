import { Type } from '@google/genai';
import { BaseFunction } from '../../models/BaseFunctions.js';

class CreateReservationFunction extends BaseFunction {
  constructor() {
    super({
      functionName: 'create_reservation',
      description:
        'Cria uma nova reserva de mesa para um cliente. ' +
        'Usa apenas após confirmar que o cliente não tem reserva activa e que a mesa tem capacity adequada ao party_size. ' +
        'Após criar a reserva, actualiza o status da mesa para "Reserved" com update_table_status.',
      properties: {
        customer_id: {
          type: Type.INTEGER,
          description: 'ID do cliente',
        },
        table_id: {
          type: Type.INTEGER,
          description: 'ID da mesa escolhida (deve ter capacity >= party_size)',
        },
        reservation_date: {
          type: Type.STRING,
          description: 'Data e hora da reserva no formato YYYY-MM-DD HH:MM:SS',
        },
        party_size: {
          type: Type.INTEGER,
          description: 'Número de pessoas',
        },
        phone: {
          type: Type.STRING,
          description: 'Telefone de contacto do cliente (opcional)',
        },
        notes: {
          type: Type.STRING,
          description: 'Notas especiais (alergias, ocasião especial, etc.) — opcional',
        },
      },
      required: ['customer_id', 'table_id', 'reservation_date', 'party_size'],
    });
  }

  mapValues(args = {}) {
    return {
      customer_id:      this.parseNumber(args.customer_id, 0),
      table_id:         this.parseNumber(args.table_id, 0),
      reservation_date: this.parseString(args.reservation_date),
      party_size:       this.parseNumber(args.party_size, 1),
      phone:            args.phone ? this.parseString(args.phone) : null,
      notes:            args.notes ? this.parseString(args.notes) : null,
    };
  }
}

const createReservationFunction = new CreateReservationFunction();
export const createReservationFunctionDeclaration = createReservationFunction.getDeclaration();
