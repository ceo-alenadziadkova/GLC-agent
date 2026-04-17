import { INTAKE_READINESS_THRESHOLDS } from './intake-readiness-threshold-policy.js';

export { INTAKE_READINESS_THRESHOLDS };

export type IntakeReadinessBadge = 'low' | 'medium' | 'high';

export function readinessBadgeFromProgress(progressPct: number): IntakeReadinessBadge {
  if (progressPct >= INTAKE_READINESS_THRESHOLDS.highMinInclusive) return 'high';
  if (progressPct >= INTAKE_READINESS_THRESHOLDS.mediumMinInclusive) return 'medium';
  return 'low';
}
