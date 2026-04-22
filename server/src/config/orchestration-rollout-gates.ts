/**
 * Server-side staged rollout for director/orchestration features.
 * Logic must match `src/app/config/orchestration-client-feature-gates.ts` (keep allowlist in sync).
 */

import type { FeatureRolloutMode } from './feature-flags.js';
import {
  getDirectorDeepDiveRolloutMode,
  getDirectorSubAgentsRolloutMode,
  getOrchestrationRoadmapNarrativeRolloutMode,
  isDirectorDeepDiveOnDemandEnabled,
  isDirectorSubAgentsEnabled,
  isOrchestrationRoadmapNarrativeEnabled,
} from './feature-flags.js';

export const ORCHESTRATION_ROLLOUT_ALLOWLIST_EMAILS: readonly string[] = [
  'ceo.alenadziadkova@gmail.com',
] as const;

function normalizeEmail(raw: string | null | undefined): string | null {
  if (raw == null) return null;
  const t = raw.trim().toLowerCase();
  return t.length > 0 ? t : null;
}

function isEmailInAllowlist(
  userEmail: string | null | undefined,
  allowlist: readonly string[],
): boolean {
  const n = normalizeEmail(userEmail);
  if (n == null) return false;
  return allowlist.some((a) => normalizeEmail(a) === n);
}

function isRolloutModeUnlockedForUser(
  mode: FeatureRolloutMode,
  userEmail: string | null | undefined,
  allowlist: readonly string[],
): boolean {
  if (mode === 'shadow') return false;
  if (mode === 'ga') return true;
  return isEmailInAllowlist(userEmail, allowlist);
}

/** Deep-dive POST/GET quota: base env flag, else staged mode + allowlist. */
export function isDirectorDeepDiveOnDemandEnabledForRequest(
  userEmail: string | null | undefined,
): boolean {
  if (isDirectorDeepDiveOnDemandEnabled()) return true;
  return isRolloutModeUnlockedForUser(
    getDirectorDeepDiveRolloutMode(),
    userEmail,
    ORCHESTRATION_ROLLOUT_ALLOWLIST_EMAILS,
  );
}

/** CMO sub-agent path in worker: base flag, else staged + allowlist (mirrors client `getEffective*`). */
export function isDirectorSubAgentsEnabledForRequest(
  userEmail: string | null | undefined,
): boolean {
  if (isDirectorSubAgentsEnabled()) return true;
  return isRolloutModeUnlockedForUser(
    getDirectorSubAgentsRolloutMode(),
    userEmail,
    ORCHESTRATION_ROLLOUT_ALLOWLIST_EMAILS,
  );
}

/**
 * Roadmap narrative fields on `GET /timeline` (milestones, top_priorities):
 * base env flag, else staged mode + allowlist (mirrors SPA `getEffectiveOrchestrationRoadmapNarrativeEnabled`).
 */
export function isOrchestrationRoadmapNarrativeEnabledForRequest(
  userEmail: string | null | undefined,
): boolean {
  if (isOrchestrationRoadmapNarrativeEnabled()) return true;
  return isRolloutModeUnlockedForUser(
    getOrchestrationRoadmapNarrativeRolloutMode(),
    userEmail,
    ORCHESTRATION_ROLLOUT_ALLOWLIST_EMAILS,
  );
}
