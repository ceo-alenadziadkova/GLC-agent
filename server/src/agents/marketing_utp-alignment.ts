import { DomainAlignmentAgent } from './domain-alignment.js';

export class MarketingUtpAlignmentAgent extends DomainAlignmentAgent {
  constructor(auditId: string) {
    super(auditId, 'marketing_utp');
  }
}
