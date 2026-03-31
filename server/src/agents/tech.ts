import { BaseAgent, loadPrompt } from './base.js';
import { CrawlerCollector } from '../collectors/crawler.js';
import { PerformanceCollector } from '../collectors/performance.js';
import { DomainOutputSchema } from '../schemas/domain-output.js';

export class TechAgent extends BaseAgent {
  get phaseNumber() { return 1; }
  get domainKey() { return 'tech_infrastructure' as const; }
  get outputSchema() { return DomainOutputSchema; }
  get collectors() {
    return [new CrawlerCollector(), new PerformanceCollector()];
  }

  get instructions() { return loadPrompt('tech_infrastructure'); }
}
