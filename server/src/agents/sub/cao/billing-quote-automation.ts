import { loadPrompt } from '../../base.js';
import { DirectorSubAgentBase } from '../../director-sub-agent-base.js';
import { CaoBillingQuoteAutomationOutputSchema } from '../../../schemas/sub-agents/cao/billing-quote-automation.js';

export class CaoBillingQuoteAutomationAgent extends DirectorSubAgentBase {
  readonly id = 'cao.billing_quote_automation' as const;
  readonly directorDomain = 'automation_processes' as const;
  readonly promptRef = 'server/prompts/sub-agents/cao/billing-quote-automation.md';
  readonly outputSchema = CaoBillingQuoteAutomationOutputSchema;

  buildInstructions(_context: string, _mode: string): string {
    return loadPrompt('sub-agents/cao/billing-quote-automation');
  }
}
