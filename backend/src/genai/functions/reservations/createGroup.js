import { Type } from '../../config/types.js';
import { BaseFunction } from '../../models/BaseFunctions.js';

class CreateGroupReservationFunction extends BaseFunction {
  constructor() {
    super({
      functionName: 'create_group_reservation',
      description:
        'Cria uma reserva para um grupo grande que requer juntar várias mesas. ' +
        'Usa quando party_size excede a capacidade de qualquer mesa individual disponível. ' +
        'Cria a reserva na mesa principal (table_ids[0]) e marca TODAS as mesas como Reserved.',
      properties: {
        table_ids: {
          type: Type.ARRAY,
          description: 'Array de IDs das mesas a juntar (mínimo 2). Ex: [5, 6]',
          items: { type: Type.INTEGER },
        },
        user_id: {
          type: Type.INTEGER,
          description: 'ID do cliente',
        },
        reservation_date: {
          type: Type.STRING,
          description: 'Data e hora da reserva no formato YYYY-MM-DD HH:MM:SS',
        },
        party_size: {
          type: Type.INTEGER,
          description: 'Número total de pessoas',
        },
        phone: {
          type: Type.STRING,
          description: 'Telefone de contacto (opcional)',
        },
        notes: {
          type: Type.STRING,
          description: 'Notas especiais (alergias, ocasião, etc.) — opcional',
        },
      },
      required: ['table_ids', 'reservation_date', 'party_size'],
    });
  }

  mapValues(args = {}) {
    return {
      table_ids:        Array.isArray(args.table_ids) ? args.table_ids.map(Number) : [],
      user_id:          args.user_id != null ? this.parseNumber(args.user_id, 0) : null,
      reservation_date: this.parseString(args.reservation_date),
      party_size:       this.parseNumber(args.party_size, 1),
      phone:            args.phone ? this.parseString(args.phone) : null,
      notes:            args.notes ? this.parseString(args.notes) : null,
    };
  }
}

const createGroupReservationFunction = new CreateGroupReservationFunction();
export const createGroupReservationFunctionDeclaration = createGroupReservationFunction.getDeclaration();
