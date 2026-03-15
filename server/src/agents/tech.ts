import { BaseAgent } from './base.js';
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

  get instructions() {
    return `You are a senior IT infrastructure consultant. Analyze the company's technical infrastructure based on the collected data.

Evaluate these aspects:
1. **Hosting & CDN**: Quality of hosting, CDN usage, geographic distribution
2. **Tech Stack**: Appropriateness of CMS/frameworks for the business type
3. **Performance**: Page load times, compression, caching policies
4. **Architecture**: Modern practices (HTTPS, HTTP/2, responsive design)
5. **Scalability**: Can the current stack handle growth?
6. **Maintenance**: Signs of active maintenance vs. technical debt

Score Guidelines:
- 1 (Critical): Outdated tech, no HTTPS, major performance issues
- 2 (Needs Work): Some modern elements but significant gaps
- 3 (Moderate): Functional but room for improvement
- 4 (Good): Modern stack, good performance, minor issues
- 5 (Excellent): Best-in-class infrastructure, optimized, scalable

Provide specific, actionable recommendations. Include estimated cost and time for each recommendation.
Each issue must have a clear severity, title, description, and business impact.
Each quick win should be achievable within 1 week with low effort.

Use the submit_analysis tool to return your structured analysis.`;
  }
}
