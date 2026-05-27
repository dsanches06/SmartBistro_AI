import { Type } from '@google/genai';
import { BaseFunction } from '../../models/BaseFunctions.js';

class CreateLogFunction extends BaseFunction {
  constructor() {
    super({
      functionName: 'create_log',
      description:
        'Regista um log de execução do pipeline de agentes. ' +
        "O Gerente usa no final do pipeline com status 'success' ou 'error'.",
      properties: {
        order_id: {
          type: Type.INTEGER,
          description: 'ID do pedido associado ao log (opcional em caso de erro precoce)',
        },
        agent_name: {
          type: Type.STRING,
          description: "Nome do agente que gerou o log (ex: 'orchestrator', 'maitre', 'chefe', 'gerente')",
        },
        status: {
          type: Type.STRING,
          description: "Estado da execução: 'success' | 'error'",
        },
        input_payload: {
          type: Type.STRING,
          description: 'JSON com os dados de entrada do agente (stringify)',
        },
        output_payload: {
          type: Type.STRING,
          description: 'JSON com o resultado produzido pelo agente (stringify)',
        },
      },
      required: ['agent_name', 'status'],
    });
  }

  mapValues(args = {}) {
    return {
      order_id:       args.order_id ? this.parseNumber(args.order_id, 0) : null,
      agent_name:     this.parseString(args.agent_name, 'orchestrator'),
      status:         this.parseString(args.status, 'success'),
      input_payload:  this.parseString(args.input_payload, '{}'),
      output_payload: this.parseString(args.output_payload, '{}'),
    };
  }
}

const createLogFunction = new CreateLogFunction();
export const createLogFunctionDeclaration = createLogFunction.getDeclaration();
export const functionDeclarations = [createLogFunctionDeclaration];
export const createLog = createLogFunction.execute.bind(createLogFunction);
