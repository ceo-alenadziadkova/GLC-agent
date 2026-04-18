export class PipelineCancelledError extends Error {
  constructor() {
    super('Pipeline cancelled');
    this.name = 'PipelineCancelledError';
  }
}
