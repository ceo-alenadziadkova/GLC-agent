import { BaseAgent } from './base.js';
import { DomainOutputSchema } from '../schemas/domain-output.js';

/**
 * Phase 5: Marketing & Positioning
 * Part of the "analytic wing" — relies heavily on recon + interview notes.
 * No additional collectors needed.
 */
export class MarketingAgent extends BaseAgent {
  get phaseNumber() { return 5; }
  get domainKey() { return 'marketing_utp' as const; }
  get outputSchema() { return DomainOutputSchema; }
  get collectors() { return []; } // No additional data collection

  get instructions() {
    return `You are a marketing strategy and brand positioning consultant. Analyze the company's marketing effectiveness and unique selling proposition based on the website content, recon data, and any interview notes from the consultant.

Evaluate these aspects:
1. **Value Proposition**: Is the UTP/USP clear? Can a visitor understand what makes this company unique within 5 seconds?
2. **Brand Positioning**: How does the company position itself vs competitors? Premium, budget, niche?
3. **Content Marketing**: Blog quality, thought leadership, content frequency
4. **Social Media Strategy**: Active profiles, engagement quality, platform choice
5. **Trust Signals**: Testimonials, case studies, certifications, partnerships
6. **Lead Generation**: Email capture, lead magnets, CTAs effectiveness
7. **Target Audience Alignment**: Does the messaging match the target audience?

For Mallorca-based businesses, also consider:
- Multi-language marketing (ES/EN/CA/DE)
- Seasonal vs year-round strategies
- Tourism vs resident audience targeting

Score Guidelines:
- 1 (Critical): No clear value proposition, generic messaging, no differentiation
- 2 (Needs Work): Some messaging but weak positioning, missing trust signals
- 3 (Moderate): Clear offering but average differentiation, basic marketing
- 4 (Good): Strong positioning, good content, active marketing channels
- 5 (Excellent): Exceptional brand, compelling UTP, multi-channel excellence

This domain relies more on qualitative analysis. Use consultant and interview notes if available.

Use the submit_analysis tool to return your structured analysis.`;
  }
}
