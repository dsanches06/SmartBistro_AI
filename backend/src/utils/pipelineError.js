// Erro estruturado do pipeline de agentes (Maître/Chef/Gerente) — carrega code/stage/details
// para o controller decidir a resposta HTTP sem ter de parsear a mensagem.
export class PipelineError extends Error {
  constructor(message, { code = 'PIPELINE_ERROR', stage = 'unknown', details = undefined, cause = undefined } = {}) {
    super(message);
    this.name = 'PipelineError';
    this.code = code;
    this.stage = stage;
    this.details = details;
    if (cause) this.cause = cause;
  }
}

export default PipelineError;
