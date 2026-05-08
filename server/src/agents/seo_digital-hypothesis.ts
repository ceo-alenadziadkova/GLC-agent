import { DomainHypothesisAgent } from './domain-hypothesis.js';

export class SeoDigitalHypothesisAgent extends DomainHypothesisAgent {
  constructor(auditId: string) {
    super(auditId, 'seo_digital');
  }
}
