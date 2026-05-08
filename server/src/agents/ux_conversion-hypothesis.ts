import { DomainHypothesisAgent } from './domain-hypothesis.js';

export class UxConversionHypothesisAgent extends DomainHypothesisAgent {
  constructor(auditId: string) {
    super(auditId, 'ux_conversion');
  }
}
