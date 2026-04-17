import { SYSTEM_DEFAULTS } from './system-defaults.js';

export const PLATFORM_RUNTIME_POLICY_PATCH_FIELDS = [
  'intake_token_ttl_days',
  'evaluation_retention_default_days',
  'evaluation_retention_extended_days',
  'evaluation_retention_internal_only_days',
] as const;

export type PlatformRuntimePolicyPatchField = (typeof PLATFORM_RUNTIME_POLICY_PATCH_FIELDS)[number];

export const PLATFORM_BANDIT_RECOMPUTE_LOCK_TTL_MS = SYSTEM_DEFAULTS.bandits.recomputeLockTtlMs;
