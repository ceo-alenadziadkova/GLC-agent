import { MINUTE_MS } from './rate-limits.js';
import { PIPELINE_PHASE_ACTIVE_STATUSES } from './pipeline-status.js';

/**
 * Constants used by `PipelineOrchestrator`.
 *
 * Keep this module free of side effects: pure CONFIG, not runtime orchestration logic.
 */
export const AUTO_WING_PHASES = [1, 2, 3, 4] as const;
export const ANALYTIC_WING_PHASES = [5, 6] as const;

export const STALLED_PHASE_ACTIVE_STATUSES = PIPELINE_PHASE_ACTIVE_STATUSES;

export const PIPELINE_PHASE_RUN_ATTEMPT_INITIAL = 1 as const;

export const MS_PER_MINUTE = MINUTE_MS;

/**
 * Token accounting helper for cost estimates.
 * Stored cost values are already rounded/normalized elsewhere; this constant exists only
 * to remove magic numbers from the orchestrator.
 */
export const TOKENS_PER_MILLION = 1_000_000 as const;

