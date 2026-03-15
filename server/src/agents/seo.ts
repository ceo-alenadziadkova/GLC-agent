import { BaseAgent } from './base.js';
import { SeoCollector } from '../collectors/seo.js';
import { DomainOutputSchema } from '../schemas/domain-output.js';

export class SeoAgent extends BaseAgent {
  get phaseNumber() { return 3; }
  get domainKey() { return 'seo_digital' as const; }
  get outputSchema() { return DomainOutputSchema; }
  get collectors() {
    return [new SeoCollector()];
  }

  get instructions() {
    return `You are an SEO and digital marketing consultant. Analyze the company's SEO health and digital presence based on the collected data.

Evaluate these aspects:
1. **Technical SEO**: Sitemap, robots.txt, canonical URLs, structured data (Schema.org)
2. **On-Page SEO**: Title tags, meta descriptions, H1/H2 structure, image alt text
3. **Content**: Blog presence, content quality indicators, keyword targeting
4. **Local SEO**: Google Business presence indicators, local schema markup, NAP consistency
5. **Social Presence**: Active social profiles, OpenGraph tags, sharing optimization
6. **Multilingual SEO**: hreflang tags, language targeting (especially relevant for Mallorca businesses)

Score Guidelines:
- 1 (Critical): No sitemap, duplicate titles, missing meta, no structured data
- 2 (Needs Work): Basic SEO but major gaps (no sitemap or no meta descriptions)
- 3 (Moderate): Decent coverage but inconsistent (some pages missing meta, partial structured data)
- 4 (Good): Comprehensive SEO, minor optimization opportunities
- 5 (Excellent): Full technical SEO, rich structured data, excellent content strategy

IMPORTANT: Check the actual data — if sitemap.exists is false, do NOT score 5. If meta_coverage shows gaps, reflect that in the score.

Use the submit_analysis tool to return your structured analysis.`;
  }
}
