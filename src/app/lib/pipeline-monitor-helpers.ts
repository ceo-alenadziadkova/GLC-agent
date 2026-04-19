export type PhSt = 'completed' | 'running' | 'pending' | 'review' | 'skipped' | 'failed';

/** Persisted `audits.status` values while the orchestrator is executing a phase (matches server `PIPELINE_PHASE_ACTIVE_STATUSES`). */
export const PIPELINE_AUDIT_ACTIVE_STATUSES = ['recon', 'auto', 'analytic', 'strategy'] as const;

export function isPipelineAuditActiveStatus(status: string): boolean {
  return (PIPELINE_AUDIT_ACTIVE_STATUSES as readonly string[]).includes(status);
}

/** Subset of `StatusPill` variants used by the pipeline monitor header. */
export type PipelineMonitorHeaderPillStatus = 'pending' | 'running' | 'completed' | 'review' | 'failed' | 'cancelled';

export type PipelineMonitorHeaderPresentation = {
  status: PipelineMonitorHeaderPillStatus;
  pulse: boolean;
};

/**
 * Map persisted `audits.status` to the header badge (avoid showing "Running" + pulse during `review` pauses).
 */
export function getPipelineMonitorHeaderPresentation(auditStatus: string): PipelineMonitorHeaderPresentation {
  if (isPipelineAuditActiveStatus(auditStatus)) {
    return { status: 'running', pulse: true };
  }
  switch (auditStatus) {
    case 'completed':
      return { status: 'completed', pulse: false };
    case 'cancelled':
      return { status: 'cancelled', pulse: false };
    case 'failed':
      return { status: 'failed', pulse: false };
    case 'review':
      return { status: 'review', pulse: false };
    case 'created':
      return { status: 'pending', pulse: false };
    default:
      return { status: 'pending', pulse: false };
  }
}

export const REVIEW_AFTER_PHASES_FULL = [0, 4, 7] as const;
export const REVIEW_AFTER_PHASES_EXPRESS = [0, 4] as const;
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
    if (phaseId === currentPhase) return 'failed';
    return 'pending';
  }

  if (auditStatus === 'cancelled') {
    if (phaseId < currentPhase) return 'completed';
    if (phaseId === currentPhase) return 'pending';
    return 'pending';
  }

  if (phaseId < currentPhase) return 'completed';
  if (phaseId === currentPhase) {
    const review = reviews.find(r => r.after_phase === phaseId);
    if (review?.status === 'pending') return 'review';
    // Approve clears the gate but does not advance `current_phase` until POST pipeline/next.
    // Without this branch, the card stays "running" forever (no agent work, misleading UX).
    if (auditStatus === 'review' && review?.status === 'approved') return 'completed';
    // Orchestrator idle (`review`): never show a fake "running" card (e.g. after platform
    // resume from `cancelled` mid-phase — no review row for this phase, but agent is not active).
    if (auditStatus === 'review') return 'review';
    return 'running';
  }
  return 'pending';
}
