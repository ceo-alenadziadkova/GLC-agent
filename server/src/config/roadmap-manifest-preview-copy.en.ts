/**
 * User-facing strings returned in roadmap manifest preview API (English).
 */

export const ROADMAP_MANIFEST_PREVIEW_COPY = {
  confidenceSingleDomain:
    'Single-domain coverage: cross-lane dependencies and orchestration use lower confidence than a full six-domain audit.',
  confidencePartialCoverage:
    'Partial coverage: roadmap lanes reflect selected domains only; uncovered domains are listed as waiting list candidates.',
  confidenceStrategyOff:
    'Strategy synthesis is off for this plan; orchestration pack still reflects current domain outputs when available.',
} as const;
