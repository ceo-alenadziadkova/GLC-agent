import { DOMAIN_KEYS, type DomainKey } from '@glc/intake-core';

/**
 * Commercial orchestration policy for coverage-gap upsell and recalculation preview.
 */
export const ORCHESTRATION_COMMERCIAL_POLICY = {
  maxSuggestedDomains: 3,
  defaultIncrementalEffortWeeks: 2,
  minCoverageDensityBandForOffer: 'standard',
  maxConfidenceCalloutsForOffer: 3,
  /** Max deterministic “why now” bullets per offer (dependency-aware rationale). */
  maxWhyNowBullets: 3,
  incrementalEffortWeeksByDensity: {
    sparse: 1,
    standard: 2,
    dense: 3,
  },
} as const;

export const ORCHESTRATION_COMMERCIAL_DOMAIN_VALUE_LABELS: Record<DomainKey, string> = Object.fromEntries(
  DOMAIN_KEYS.map(domain => [domain, domain.replace(/_/g, ' ')]),
) as Record<DomainKey, string>;
