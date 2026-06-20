import { Type } from '../../config/types.js';
import { BaseFunction } from '../../models/BaseFunctions.js';

class CreateNotificationFunction extends BaseFunction {
  constructor() {
    super({
      functionName: 'create_notification',
      description:
        'Envia uma notificação para um utilizador ou para a equipa do restaurante. ' +
        'O Chefe usa para alertar a cozinha sobre novos pedidos ou itens em falta.',
      properties: {
        user_id: {
          type: Type.INTEGER,
          description: 'ID do utilizador destinatário da notificação',
        },
        title: {
          type: Type.STRING,
          description: 'Título curto da notificação',
        },
        message: {
          type: Type.STRING,
          description: 'Corpo da mensagem da notificação',
        },
      },
      required: ['user_id', 'title', 'message'],
    });
  }

  mapValues(args = {}) {
    return {
      user_id: this.parseNumber(args.user_id, 0),
      title:   this.parseString(args.title),
      message: this.parseString(args.message),
    };
  }
}

const createNotificationFunction = new CreateNotificationFunction();
export const createNotificationFunctionDeclaration = createNotificationFunction.getDeclaration();
