import { DomainAlignmentAgent } from './domain-alignment.js';

export class AutomationProcessesAlignmentAgent extends DomainAlignmentAgent {
  constructor(auditId: string) {
    super(auditId, 'automation_processes');
  }
}
