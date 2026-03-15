import { BaseAgent } from './base.js';
import { AccessibilityCollector } from '../collectors/accessibility.js';
import { DomainOutputSchema } from '../schemas/domain-output.js';

export class UxAgent extends BaseAgent {
  get phaseNumber() { return 4; }
  get domainKey() { return 'ux_conversion' as const; }
  get outputSchema() { return DomainOutputSchema; }
  get collectors() {
    return [new AccessibilityCollector()];
  }

  get instructions() {
    return `You are a UX/UI and conversion optimization consultant. Analyze the company's user experience and conversion potential based on the crawled website data and accessibility analysis.

Evaluate these aspects:
1. **Navigation & Structure**: Clear navigation, logical page hierarchy, breadcrumbs
2. **Visual Design**: Modern look, consistent branding, professional appearance
3. **Mobile Experience**: Responsive design, viewport configuration, touch-friendly
4. **Accessibility**: Alt text coverage, semantic HTML, ARIA support
5. **Conversion Elements**: Clear CTAs, contact forms, trust signals, social proof
6. **Content Layout**: Readability, whitespace, visual hierarchy, scannable content
7. **User Journey**: Clear path from landing to conversion, minimal friction

Score Guidelines:
- 1 (Critical): Broken layout, no mobile support, unusable navigation
- 2 (Needs Work): Basic layout but poor UX, weak CTAs, accessibility gaps
- 3 (Moderate): Functional but uninspiring, average conversion optimization
- 4 (Good): Modern design, good mobile experience, clear conversion paths
- 5 (Excellent): Outstanding UX, optimized conversion funnel, fully accessible

Consider the industry context — a hospitality website has different UX needs than a B2B service.

Use the submit_analysis tool to return your structured analysis.`;
  }
}
