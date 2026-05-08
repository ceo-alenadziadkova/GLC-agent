import {
  getCoalitionProtocolAllowlistClientIds,
  getCoalitionProtocolAllowlistUserIds,
  getCoalitionProtocolRolloutMode,
  isCoalitionProtocolEnabled,
  type FeatureRolloutMode,
} from './feature-flags.js';

function includesNormalized(allowlist: readonly string[], value: string | null | undefined): boolean {
  const normalized = value?.trim();
  if (!normalized) return false;
  return allowlist.some(item => item.trim() === normalized);
}

export function isCoalitionRolloutUnlockedForAudit(args: {
  userId: string | null | undefined;
  clientId: string | null | undefined;
  mode?: FeatureRolloutMode;
}): boolean {
  if (!isCoalitionProtocolEnabled()) return false;
  const mode = args.mode ?? getCoalitionProtocolRolloutMode();
  if (mode === 'shadow' || mode === 'ga') return true;
  return (
    includesNormalized(getCoalitionProtocolAllowlistUserIds(), args.userId)
    || includesNormalized(getCoalitionProtocolAllowlistClientIds(), args.clientId)
  );
}
