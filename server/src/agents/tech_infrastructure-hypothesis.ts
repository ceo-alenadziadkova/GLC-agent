import { DomainHypothesisAgent } from './domain-hypothesis.js';

export class TechInfrastructureHypothesisAgent extends DomainHypothesisAgent {
  constructor(auditId: string) {
    super(auditId, 'tech_infrastructure');
  }
}
