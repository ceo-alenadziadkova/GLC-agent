import { DomainAlignmentAgent } from './domain-alignment.js';

export class TechInfrastructureAlignmentAgent extends DomainAlignmentAgent {
  constructor(auditId: string) {
    super(auditId, 'tech_infrastructure');
  }
}
