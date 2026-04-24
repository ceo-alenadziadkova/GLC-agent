/**
 * Canonical orchestration contract policy.
 * Keep transport-level contract guards and compatibility windows here.
 */
export const ORCHESTRATION_CONTRACT_POLICY = {
  strategyConfidenceHighFloor: 0.75,
  strategyConfidenceMediumFloor: 0.45,
  maxPackDiffVersionStep: 1,
  orchestratorAliasDeprecation: {
    sunsetDate: '2026-10-01',
    docsPath: '/docs/API.md',
  },
} as const;

