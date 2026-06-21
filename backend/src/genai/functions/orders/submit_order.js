import { Type } from '../../config/types.js';
import { BaseFunction } from '../../models/BaseFunctions.js';

// Função do chatbot para submeter um pedido completo ao pipeline de agentes.
// Substitui create_order + create_order_item + verificação de stock individual.
class SubmitOrderFunction extends BaseFunction {
  constructor() {
    super({
      functionName: 'submit_order',
      description:
        'Submete o pedido completo ao pipeline de cozinha (Chef IA verifica stock e cria sequência). ' +
        'Usa APENAS depois de ter todos os itens confirmados pelo cliente. ' +
        'Para TAKEAWAY devolve o total para pagamento. Para TABLE informa que vai para a cozinha.',
      properties: {
        user_id: {
          type: Type.INTEGER,
          description: 'ID do cliente',
        },
        table_id: {
          type: Type.INTEGER,
          description: 'ID da mesa (null para Takeaway)',
        },
        service_type: {
          type: Type.STRING,
          description: '"Table" ou "Takeaway"',
        },
        allergy_restrictions: {
          type: Type.STRING,
          description: 'Restrições alimentares (string vazia se não houver)',
        },
        items: {
          type: Type.ARRAY,
          description: 'Lista de itens escolhidos pelo cliente',
          items: {
            type: Type.OBJECT,
            properties: {
              item_id:  { type: Type.INTEGER, description: 'ID do item no menu' },
              name:     { type: Type.STRING,  description: 'Nome do item' },
              quantity: { type: Type.INTEGER, description: 'Quantidade' },
              price:    { type: Type.NUMBER,  description: 'Preço unitário' },
            },
          },
        },
      },
      required: ['user_id', 'service_type', 'items'],
    });
  }

  mapValues(args = {}) {
    return {
      user_id:              this.parseNumber(args.user_id, 0),
      table_id:             args.table_id != null ? this.parseNumber(args.table_id, null) : null,
      service_type:         this.parseString(args.service_type, 'Table'),
      allergy_restrictions: this.parseString(args.allergy_restrictions, ''),
      items:                Array.isArray(args.items) ? args.items : [],
    };
  }
}

const fn = new SubmitOrderFunction();
export const submitOrderFunctionDeclaration = fn.getDeclaration();
