import { BaseAgent, loadPrompt } from './base.js';
import { DomainOutputSchema } from '../schemas/domain-output.js';

/**
 * Phase 6: Automation & Processes
 * Analytic wing — relies on recon tech_stack + interview data.
 * No additional collector (automation is internal, not visible from HTML).
 */
export class AutomationAgent extends BaseAgent {
  get phaseNumber() { return 6; }
  get domainKey() { return 'automation_processes' as const; }
  get outputSchema() { return DomainOutputSchema; }
  get collectors() { return []; }

  get instructions() { return loadPrompt('automation_processes'); }
}
