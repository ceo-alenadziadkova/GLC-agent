/**
 * Deterministic coercion for Claude domain-agent `tool_use` payloads before DomainOutputSchema.
 * Values are analyst-facing clarification text appended when Zod refinement would reject raw model output.
 */
import type { DomainKey } from '@glc/intake-core';

/** Must stay aligned with IssueSchema / RecommendationSchema `verification_method` enums. */
export const DOMAIN_OUTPUT_VERIFICATION_METHOD_VALUES = Object.freeze([
  'single_source',
  'multi_source',
  'heuristic',
  'manual_review',
  'not_assessed',
] as const);

export type DomainOutputVerificationMethod = (typeof DOMAIN_OUTPUT_VERIFICATION_METHOD_VALUES)[number];

/** Short prefix → canonical snake_case keys (covers UX:, SEO:, MKT:, etc.). */
export const DOMAIN_CROSS_REF_PREFIX_ALIAS: Partial<Record<string, DomainKey>> = Object.freeze({
  ux: 'ux_conversion',
  uxconv: 'ux_conversion',
  ui: 'ux_conversion',
  seo: 'seo_digital',
  mkt: 'marketing_utp',
  marketing: 'marketing_utp',
  mar: 'marketing_utp',
  sec: 'security_compliance',
  security: 'security_compliance',
  tech: 'tech_infrastructure',
  ti: 'tech_infrastructure',
  auto: 'automation_processes',
  ap: 'automation_processes',
  automation: 'automation_processes',
});

export const CANON_CROSS_DOMAIN_PEER_REF_REGEX =
  /^(tech_infrastructure|security_compliance|seo_digital|ux_conversion|marketing_utp|automation_processes):H[1-9]\d*$/;

/** Appended to recommendation.impact when a percent appears without benchmark/source wording. */
export const RECOMMENDATION_IMPACT_PERCENT_BENCHMARK_SUFFIX_EN =
  ' Directional qualitative estimate — add cited benchmark or source.';
