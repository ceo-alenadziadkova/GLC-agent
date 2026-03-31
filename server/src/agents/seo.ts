import { BaseAgent, loadPrompt } from './base.js';
import { SeoCollector } from '../collectors/seo.js';
import { DomainOutputSchema } from '../schemas/domain-output.js';

export class SeoAgent extends BaseAgent {
  get phaseNumber() { return 3; }
  get domainKey() { return 'seo_digital' as const; }
  get outputSchema() { return DomainOutputSchema; }
  get collectors() {
    return [new SeoCollector()];
  }

  get instructions() { return loadPrompt('seo_digital'); }
}
