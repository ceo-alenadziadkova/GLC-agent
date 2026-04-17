import { INTAKE_READINESS_THRESHOLDS } from '@glc/intake-core';

export const SYSTEM_DEFAULTS_INTAKE = {
  tokenTtlDays: 7,
  /** Same canonical policy as `@glc/intake-core` readiness badge thresholds. */
  readinessThresholds: INTAKE_READINESS_THRESHOLDS,
  /** When `intake_brief.collection_mode` is null (`ContextBuilder` assembly). */
  defaultBriefCollectionMode: 'self_serve' as const,
  /** When `intake_brief.readiness_badge` is null (`ContextBuilder` assembly). */
  defaultReadinessBadge: 'low' as const,
} as const;
