import { Type } from '@google/genai';
import { BaseFunction } from '../../models/BaseFunctions.js';

class CreateNotificationFunction extends BaseFunction {
  constructor() {
    super({
      functionName: 'create_notification',
      description:
        'Envia uma notificação para um cliente ou para a equipa do restaurante. ' +
        'O Chefe usa para alertar a cozinha sobre novos pedidos ou itens em falta.',
      properties: {
        customer_id: {
          type: Type.INTEGER,
          description: 'ID do cliente destinatário da notificação',
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
      required: ['customer_id', 'title', 'message'],
    });
  }

  mapValues(args = {}) {
    return {
      customer_id: this.parseNumber(args.customer_id, 0),
      title:       this.parseString(args.title),
      message:     this.parseString(args.message),
    };
  }
}

const createNotificationFunction = new CreateNotificationFunction();
export const createNotificationFunctionDeclaration = createNotificationFunction.getDeclaration();
export const functionDeclarations = [createNotificationFunctionDeclaration];
export const createNotification = createNotificationFunction.execute.bind(createNotificationFunction);
