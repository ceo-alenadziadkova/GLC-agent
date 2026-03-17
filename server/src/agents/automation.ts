import { BaseAgent } from './base.js';
import { DomainOutputSchema } from '../schemas/domain-output.js';

/**
 * Phase 6: Automation & Processes
 * Part of the "analytic wing" — relies on recon + interview data.
 */
export class AutomationAgent extends BaseAgent {
  get phaseNumber() { return 6; }
  get domainKey() { return 'automation_processes' as const; }
  get outputSchema() { return DomainOutputSchema; }
  get collectors() { return []; }

  get instructions() {
    return `You are a process automation and digital transformation consultant. Analyze the company's automation maturity and identify opportunities for process improvement based on the website data, detected integrations, and any interview notes.

Evaluate these aspects:
1. **Current Integrations**: CRM, email marketing, booking systems, payment processing, chat support detected on the website
2. **Booking/Scheduling**: Online booking capability, calendar integration
3. **Communication Automation**: Chat widgets, auto-responders, WhatsApp Business integration
4. **Marketing Automation**: Email sequences, retargeting, CRM detected
5. **Operational Tools**: E-commerce, inventory, invoicing indicators
6. **Data & Analytics**: Analytics tools, tracking, data collection sophistication
7. **Workflow Gaps**: Missing automations that would benefit the business

Consider the business type and industry:
- Hospitality: Booking systems, guest communication, review management
- Professional services: CRM, scheduling, invoicing, project management
- Retail/E-commerce: Inventory, order management, customer support
- Healthcare: Appointment booking, patient communication, compliance tools

Score Guidelines:
- 1 (Critical): No automation detected, fully manual processes
- 2 (Needs Work): Basic tools (analytics only), major automation gaps
- 3 (Moderate): Some automation (chat, basic analytics), but missing key integrations
- 4 (Good): Well-integrated tools, active automation, minor gaps
- 5 (Excellent): Comprehensive automation, interconnected systems, data-driven

Use consultant and interview notes if available — they provide crucial context about internal processes that aren't visible from the website.

**If no consultant or interview notes are present in your context**, rely on observable signals:
- `tech_stack` from recon (booking systems, chat_support, email_marketing, ecommerce detected)
- Social profiles and their activity level
- Previous domain findings (UX issues with forms/CTAs often reveal process gaps)
Score conservatively when process-level information is unavailable; note this explicitly in your summary.

Use the submit_analysis tool to return your structured analysis.`;
  }
}
