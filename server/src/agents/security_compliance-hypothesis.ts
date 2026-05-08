import { DomainHypothesisAgent } from './domain-hypothesis.js';

export class SecurityComplianceHypothesisAgent extends DomainHypothesisAgent {
  constructor(auditId: string) {
    super(auditId, 'security_compliance');
  }
}
