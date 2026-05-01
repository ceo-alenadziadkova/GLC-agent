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

export type AuditListPillStatus = 'pending' | 'running' | 'completed' | 'review' | 'failed' | 'cancelled';

export type AuditListPillPresentation = {
  status: AuditListPillStatus;
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

/**
 * Shared status mapper for dashboard/portfolio cards and tables.
 */
export function getAuditListPillPresentation(auditStatus: string): AuditListPillPresentation {
  if (isPipelineAuditActiveStatus(auditStatus)) {
    return { status: 'running', pulse: true };
  }

  switch (auditStatus) {
    case 'completed':
      return { status: 'completed', pulse: false };
    case 'review':
      return { status: 'review', pulse: false };
    case 'failed':
      return { status: 'failed', pulse: false };
    case 'cancelled':
      return { status: 'cancelled', pulse: false };
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

const AUTO_WING_MAX_PHASE_ID = 4;

/**
 * `after_phase` for Review Gate 2 from server `review_points`, derived from execution plan coverage.
 * Full six-domain audits use `4`; partial auto-wing coverage uses the highest selected auto phase (1–4).
 */
export function deriveAutoWingReviewAfterPhase(reviews: ReadonlyArray<{ after_phase: number }>): number {
  const auto = reviews.map(r => r.after_phase).filter(ap => ap >= 1 && ap <= AUTO_WING_MAX_PHASE_ID);
  return auto.length > 0 ? Math.max(...auto) : AUTO_WING_MAX_PHASE_ID;
}

/** True when some non-skipped phase above the sidebar row is visibly running (not inferred from stale audit status alone). */
export function hasVisiblyRunningUpstreamPhase(
  phases: ReadonlyArray<{ id: number; skipped: boolean; status: PhSt }>,
  selectedPhaseId: number,
): boolean {
  return phases.some(p => !p.skipped && p.id < selectedPhaseId && p.status === 'running');
}

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
  /** When set, phases not in this execution plan are not part of this audit (partial coverage). */
  plannedPhaseIds?: ReadonlySet<number> | null,
): PhSt {
  if (isExpress && phaseId > EXPRESS_MAX_PHASE) return 'skipped';
  if (plannedPhaseIds && plannedPhaseIds.size > 0 && !plannedPhaseIds.has(phaseId)) return 'skipped';

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
