/**
 * Canonical client-facing orchestration contract literals (timeline, manifest UX).
 * Frontend mirrors these in `src/app/config/orchestration-contract.ts`; Vitest parity enforces sync.
 */
export const ORCHESTRATION_TIMELINE_STATUSES = [
  'ready',
  'degraded',
  'missing_pack',
  'stale_manifest',
  'restricted_client_view',
] as const;

export type OrchestrationTimelineStatus = (typeof ORCHESTRATION_TIMELINE_STATUSES)[number];

export const ORCHESTRATION_MANIFEST_STATES = ['draft', 'confirmed', 'stale'] as const;

export type OrchestrationManifestState = (typeof ORCHESTRATION_MANIFEST_STATES)[number];
