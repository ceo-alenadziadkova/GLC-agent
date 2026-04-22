import { APP_FEATURE_FLAGS, type FeatureRolloutMode } from './app-feature-flags';

/**
 * Emails that see orchestration / deep-dive features before GA when rollout mode is `internal` or `pilot`.
 * Edit in deploy branch; do not gate ad-hoc in page components.
 */
/** Keep in sync with `server/src/config/orchestration-rollout-gates.ts` (`ORCHESTRATION_ROLLOUT_ALLOWLIST_EMAILS`). */
export const ORCHESTRATION_CLIENT_ROLLOUT_ALLOWLIST_EMAILS: readonly string[] = [
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

/**
 * Staged unlock: `ga` turns the feature on for everyone when the base flag is off (product sets mode to `ga` first).
 * `internal` / `pilot` require an allowlist match.
 */
function isRolloutModeUnlockedForUser(
  mode: FeatureRolloutMode,
  userEmail: string | null | undefined,
  allowlist: readonly string[],
): boolean {
  if (mode === 'shadow') return false;
  if (mode === 'ga') return true;
  return isEmailInAllowlist(userEmail, allowlist);
}

export function getEffectiveOrchestrationRoadmapNarrativeEnabled(
  userEmail: string | null | undefined,
): boolean {
  if (APP_FEATURE_FLAGS.orchestrationRoadmapNarrativeEnabled) return true;
  return isRolloutModeUnlockedForUser(
    APP_FEATURE_FLAGS.orchestrationRoadmapNarrativeRolloutMode,
    userEmail,
    ORCHESTRATION_CLIENT_ROLLOUT_ALLOWLIST_EMAILS,
  );
}

export function getEffectiveDirectorDeepDiveOnDemandEnabled(
  userEmail: string | null | undefined,
): boolean {
  if (APP_FEATURE_FLAGS.directorDeepDiveOnDemandEnabled) return true;
  return isRolloutModeUnlockedForUser(
    APP_FEATURE_FLAGS.directorDeepDiveRolloutMode,
    userEmail,
    ORCHESTRATION_CLIENT_ROLLOUT_ALLOWLIST_EMAILS,
  );
}

export function getEffectiveDirectorSubAgentsEnabled(
  userEmail: string | null | undefined,
): boolean {
  if (APP_FEATURE_FLAGS.directorSubAgentsEnabled) return true;
  return isRolloutModeUnlockedForUser(
    APP_FEATURE_FLAGS.directorSubAgentsRolloutMode,
    userEmail,
    ORCHESTRATION_CLIENT_ROLLOUT_ALLOWLIST_EMAILS,
  );
}
