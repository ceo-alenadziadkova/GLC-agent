import { BaseAgent, loadPrompt } from './base.js';
import { MarketingCollector } from '../collectors/marketing.js';
import { DomainOutputSchema } from '../schemas/domain-output.js';

/**
 * Phase 5: Marketing & Positioning
 * Part of the "analytic wing" — now has a dedicated MarketingCollector
 * that extracts observable signals from HTML (blog posts, testimonials, trust badges).
 */
export class MarketingAgent extends BaseAgent {
  get phaseNumber() { return 5; }
  get domainKey() { return 'marketing_utp' as const; }
  get outputSchema() { return DomainOutputSchema; }
  get collectors() { return [new MarketingCollector()]; }

  get instructions() { return loadPrompt('marketing_utp'); }
}
