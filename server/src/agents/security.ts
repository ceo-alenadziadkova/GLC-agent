import { BaseAgent, loadPrompt } from './base.js';
import { SecurityCollector } from '../collectors/security.js';
import { DomainOutputSchema } from '../schemas/domain-output.js';

export class SecurityAgent extends BaseAgent {
  get phaseNumber() { return 2; }
  get domainKey() { return 'security_compliance' as const; }
  get outputSchema() { return DomainOutputSchema; }
  get collectors() {
    return [new SecurityCollector()];
  }

  get instructions() { return loadPrompt('security_compliance'); }
}
