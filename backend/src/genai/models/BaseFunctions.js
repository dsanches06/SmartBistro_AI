import { PipelineError } from '../../utils/pipelineError.js';

export class BaseFunction {
  constructor(config = {}) {
    // Suporta tanto o padrão simples (functionName, description, properties, required)
    // quanto o padrão OpenAI/Groq (type, function)
    if (config.type === 'function' && config.function) {
      this.config = config;
      this.functionName = config.function.name;
      this.description = config.function.description;
      this.properties = config.function.parameters?.properties || {};
      this.required = config.function.parameters?.required || [];
    } else {
      this.functionName = config.functionName;
      this.description = config.description;
      this.properties = config.properties || {};
      this.required = config.required || [];
    }
  }

  // ── Declaração ────────────────────────────────────────────────────────────────

  getDeclaration() {
    if (this.config?.type === 'function') {
      return this.config;
    }

    return {
      name: this.functionName,
      description: this.description,
      parameters: {
        type: 'object',
        properties: this.properties,
        required: this.required,
      },
    };
  }

  // ── Helpers de parsing ────────────────────────────────────────────────────────

  parseNumber(value, fallback = 0) {
    if (value === undefined || value === null || value === '') return fallback;
    const number = Number(value);
    return Number.isNaN(number) ? fallback : number;
  }

  parseBoolean(value, fallback = false) {
    if (value === undefined || value === null) return fallback;
    if (typeof value === 'boolean') return value;
    return value === 'true' || value === '1' || value === 1;
  }

  parseString(value, fallback = '') {
    if (value === undefined || value === null) return fallback;
    return value.toString().trim();
  }

  parseDate(value, fallback = null) {
    return value || fallback;
  }

  currentDate() {
    return new Date().toISOString();
  }

  mapValues() {
    throw new PipelineError('mapValues() deve ser implementado na subclasse.', {
      code: 'NOT_IMPLEMENTED',
      stage: 'internal',
      details: null,
    });
  }

  execute(args = {}) {
    return this.mapValues(args);
  }
}
