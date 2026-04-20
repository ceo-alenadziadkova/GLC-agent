import { DOMAIN_KEYS, type DomainKey } from '@glc/intake-core';

/**
 * Commercial orchestration policy for coverage-gap upsell and recalculation preview.
 */
export const ORCHESTRATION_COMMERCIAL_POLICY = {
  maxSuggestedDomains: 3,
  defaultIncrementalEffortWeeks: 2,
} as const;

export const ORCHESTRATION_COMMERCIAL_DOMAIN_VALUE_LABELS: Record<DomainKey, string> = Object.fromEntries(
  DOMAIN_KEYS.map(domain => [domain, domain.replace(/_/g, ' ')]),
) as Record<DomainKey, string>;
