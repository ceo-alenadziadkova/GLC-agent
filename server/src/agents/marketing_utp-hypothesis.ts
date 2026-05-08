import { DomainHypothesisAgent } from './domain-hypothesis.js';

export class MarketingUtpHypothesisAgent extends DomainHypothesisAgent {
  constructor(auditId: string) {
    super(auditId, 'marketing_utp');
  }
}
