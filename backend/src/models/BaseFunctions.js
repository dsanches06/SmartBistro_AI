// ======================================================
// FILE: base_function.js
// ======================================================

/**
 * Classe Base para Functions do AI Provider (Gemini, etc)
 * Reutilizável para:
 * - users
 * - etc
 */
export class BaseFunction {
  constructor(config = {}) {
    // Suporta tanto o padrão antigo (functionName, description, properties, required)
    // quanto o novo padrão (type, function)

    if (config.type === "function" && config.function) {
      // Novo padrão (Groq, OpenAI)
      this.config = config;
      this.functionName = config.function.name;
      this.description = config.function.description;
      this.properties = config.function.parameters?.properties || {};
      this.required = config.function.parameters?.required || [];
    } else {
      // Padrão antigo (compatibilidade)
      this.functionName = config.functionName;
      this.description = config.description;
      this.properties = config.properties || {};
      this.required = config.required || [];
    }
  }

  // ======================================================
  // DECLARATION
  // ======================================================

  getDeclaration() {
    // Se foi configurado com o novo padrão, retorna a estrutura completa
    if (this.config?.type === "function") {
      return this.config;
    }

    // Padrão antigo (compatibilidade com Google GenAI)
    return {
      name: this.functionName,
      description: this.description,

      parameters: {
        type: "object",

        properties: this.properties,

        required: this.required,
      },
    };
  }

  // ======================================================
  // HELPERS
  // ======================================================

  parseNumber(value, fallback = 0) {
    if (value === undefined || value === null || value === "") {
      return fallback;
    }

    const number = Number(value);

    return Number.isNaN(number) ? fallback : number;
  }

  parseBoolean(value, fallback = false) {
    if (value === undefined || value === null) {
      return fallback;
    }

    if (typeof value === "boolean") {
      return value;
    }

    return value === "true" || value === "1" || value === 1;
  }

  parseString(value, fallback = "") {
    if (value === undefined || value === null) {
      return fallback;
    }

    return value.toString().trim();
  }

  parseDate(value, fallback = null) {
    return value || fallback;
  }

  currentDate() {
    return new Date().toISOString();
  }

  /**
   * Método que será sobrescrito
   * (POLIMORFISMO)
   */
  mapValues() {
    throw new Error("mapValues() deve ser implementado.");
  }

  execute(args = {}) {
    return this.mapValues(args);
  }
}
