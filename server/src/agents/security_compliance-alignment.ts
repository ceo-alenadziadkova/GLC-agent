import { DomainAlignmentAgent } from './domain-alignment.js';

export class SecurityComplianceAlignmentAgent extends DomainAlignmentAgent {
  constructor(auditId: string) {
    super(auditId, 'security_compliance');
  }
}
