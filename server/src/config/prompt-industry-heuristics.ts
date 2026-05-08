/**
 * Domain-specific industry heuristics for prompt composition.
 *
 * Keep these rules centralized so industry guidance does not drift across
 * individual prompt markdown files.
 */
export const PROMPT_INDUSTRY_HEURISTICS = {
  automation_processes: {
    title: 'Industry Context',
    bullets: [
      '**Hospitality**: prioritize booking flow, guest communication, and review-management automation.',
      '**Professional Services**: prioritize CRM, scheduling, and quote/invoicing handoff automation.',
      '**Retail/E-commerce**: prioritize inventory/order automation and customer-support workflow continuity.',
      '**Healthcare**: prioritize appointment workflow and compliant communication handoffs.',
    ],
  },
  marketing_utp: {
    title: 'Location-Aware Considerations',
    bullets: [
      'Adapt channel and messaging recommendations to the company market location and customer geography.',
      'Treat multilingual presence as a strategic advantage only when audience signals indicate cross-language demand.',
      'Assess seasonality from the company region and industry dynamics, not fixed assumptions.',
      'Treat local trust signals (regional certifications, associations, partnerships, directories) as high-value proof when relevant.',
    ],
  },
  ux_conversion: {
    title: 'Industry Context',
    bullets: [
      'Adjust conversion expectations by industry (for example hospitality emphasizes booking CTAs; B2B emphasizes contact/demo + case-study trust assets).',
    ],
  },
  seo_digital: {
    title: 'Industry Context',
    bullets: [
      'If the business targets multiple language markets, treat multilingual SEO (hreflang, localized metadata, content alignment) as a material scoring factor.',
    ],
  },
} as const;

type PromptNameWithIndustryHeuristics = keyof typeof PROMPT_INDUSTRY_HEURISTICS;

export function renderPromptIndustryHeuristics(promptName: string): string {
  const spec = PROMPT_INDUSTRY_HEURISTICS[promptName as PromptNameWithIndustryHeuristics];
  if (!spec) return '';
  const lines = [`## ${spec.title}`, '', ...spec.bullets.map(bullet => `- ${bullet}`)];
  return lines.join('\n');
}
