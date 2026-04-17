/**
 * Pipeline audit state constants shared across routes/services.
 *
 * These values represent DB-stored `audits.status` variants used by orchestrator and routes,
 * and are intentionally centralized to avoid drift.
 */

export const PIPELINE_PHASE_ACTIVE_STATUSES = ['recon', 'auto', 'analytic', 'strategy'] as const;
export const PIPELINE_TERMINAL_STATUSES = ['completed', 'failed', 'cancelled'] as const;

/**
 * Status values that allow claiming / advancing a phase.
 * Used by:
 * - POST /api/audits/:id/pipeline/next
 * - POST /api/audits/:id/pipeline/retry
 */
export const PIPELINE_CLAIMABLE_STATUSES = ['review', 'completed', 'failed', 'created'] as const;

/**
 * Status values that allow cancelling a pipeline safely.
 * Used by:
 * - POST /api/audits/:id/pipeline/stop
 */
export const PIPELINE_STOP_CLAIMABLE_STATUSES = ['created', 'recon', 'auto', 'analytic', 'strategy', 'review'] as const;

export type PipelinePhaseStatus = 'recon' | 'auto' | 'analytic' | 'strategy';

/**
 * Subset of persisted `audits.status` values used by the pipeline orchestrator
 * (updates and comparisons). Keeps string literals out of service code.
 */
export const PIPELINE_AUDIT_ORCHESTRATOR_STATUS = {
  cancelled: 'cancelled',
  failed: 'failed',
  review: 'review',
  auto: 'auto',
  analytic: 'analytic',
} as const;

/**
 * Map pipeline phase number to persisted `audits.status`.
 * - 0 => recon
 * - 1..4 => auto
 * - 5..6 => analytic
 * - 7+ => strategy
 */
export function pipelineStatusForPhase(phase: number): PipelinePhaseStatus {
  if (phase === 0) return 'recon';
  if (phase >= 1 && phase <= 4) return 'auto';
  if (phase >= 5 && phase <= 6) return 'analytic';
  return 'strategy';
}

