import { DomainHypothesisAgent } from './domain-hypothesis.js';

export class AutomationProcessesHypothesisAgent extends DomainHypothesisAgent {
  constructor(auditId: string) {
    super(auditId, 'automation_processes');
  }
}
