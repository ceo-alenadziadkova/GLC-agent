import { DomainAlignmentAgent } from './domain-alignment.js';

export class UxConversionAlignmentAgent extends DomainAlignmentAgent {
  constructor(auditId: string) {
    super(auditId, 'ux_conversion');
  }
}
