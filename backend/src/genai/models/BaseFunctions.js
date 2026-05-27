/**
 * Classe Base para declarações de funções (tools) do Gemini.
 * Reutilizável por todos os agentes do SmartBistro.
 */
export class BaseFunction {
  constructor(config = {}) {
    // Suporta tanto o padrão antigo (functionName, description, properties, required)
    // quanto o novo padrão (type, function) compatível com OpenAI/Groq
    if (config.type === 'function' && config.function) {
      // Novo padrão (OpenAI / Groq)
      this.config = config;
      this.functionName = config.function.name;
      this.description = config.function.description;
      this.properties = config.function.parameters?.properties || {};
      this.required = config.function.parameters?.required || [];
    } else {
      // Padrão antigo (compatibilidade com Google GenAI)
      this.functionName = config.functionName;
      this.description = config.description;
      this.properties = config.properties || {};
      this.required = config.required || [];
    }
  }

  // ── Declaração ────────────────────────────────────────────────────────────────

  getDeclaration() {
    // Se foi configurado com o novo padrão, devolve a estrutura completa
    if (this.config?.type === 'function') {
      return this.config;
    }

    // Padrão antigo (Google GenAI)
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

  /**
   * Método a ser sobrescrito nas subclasses (polimorfismo).
   * Recebe os args do Gemini e devolve o resultado da operação.
   */
  mapValues() {
    throw new Error('mapValues() deve ser implementado na subclasse.');
  }

  execute(args = {}) {
    return this.mapValues(args);
  }
}
