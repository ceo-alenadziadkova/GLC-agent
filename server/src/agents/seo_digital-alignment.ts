import { DomainAlignmentAgent } from './domain-alignment.js';

export class SeoDigitalAlignmentAgent extends DomainAlignmentAgent {
  constructor(auditId: string) {
    super(auditId, 'seo_digital');
  }
}
