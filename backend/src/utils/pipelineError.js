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
