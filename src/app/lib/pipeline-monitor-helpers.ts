export type PhSt = 'completed' | 'running' | 'pending' | 'review' | 'skipped' | 'failed';

export const REVIEW_AFTER_PHASES_FULL = [0, 4, 7];
export const REVIEW_AFTER_PHASES_EXPRESS = [0, 4];
export const EXPRESS_MAX_PHASE = 4;

export const AUTO_WING_IDS = [1, 2, 3, 4];
export const ANALYTIC_WING_IDS = [5, 6];

/**
 * Determine phase display status.
 *
 * Priority order:
 * 1. Domain-level status (authoritative for parallel phases — each domain updates independently).
 * 2. Audit-level status / current_phase (fallback for recon + strategy).
 */
export function getPhaseStatus(
  phaseId: number,
  currentPhase: number,
  auditStatus: string,
  reviews: Array<{ after_phase: number; status: string }>,
  isExpress: boolean,
  domainStatus: string | null,
): PhSt {
  if (isExpress && phaseId > EXPRESS_MAX_PHASE) return 'skipped';

  if (domainStatus) {
    if (domainStatus === 'completed') return 'completed';
    if (domainStatus === 'failed') return 'failed';
    if (domainStatus === 'collecting' || domainStatus === 'analyzing') return 'running';
  }

  if (auditStatus === 'completed') return 'completed';
  if (auditStatus === 'failed') {
    if (phaseId < currentPhase) return 'completed';
    if (phaseId === currentPhase) return 'review';
    return 'pending';
  }

  if (phaseId < currentPhase) return 'completed';
  if (phaseId === currentPhase) {
    const review = reviews.find(r => r.after_phase === phaseId);
    if (review?.status === 'pending') return 'review';
    return 'running';
  }
  return 'pending';
}
