/**
 * GLC Orchestrator optional LLM synthesis (Strategy Lab) — constants only; services import from here.
 */

/**
 * Same numeric phase bucket as strategy execution pack: on-demand Strategy Lab Claude calls
 * after pipeline strategy (phase 7) is complete.
 */
export const ORCHESTRATION_SYNTHESIS_TOKEN_PHASE = 7 as const;

export const ORCHESTRATION_SYNTHESIS_CLAUDE_TOOL_NAME = 'submit_orchestration_synthesis' as const;

/** Prepended to model-supplied conflict ids so they never collide with deterministic graph repair ids. */
export const ORCHESTRATION_SYNTHESIS_CONFLICT_ID_PREFIX = 'glcSynth_' as const;

/** Caps for synthesis user payload and tool output (no inline literals in services). */
export const ORCHESTRATION_SYNTHESIS_CONTEXT_LIMITS = {
  maxDomainRowsInContext: 12,
  maxIssuesPerDomain: 8,
  maxIssueTitleLength: 120,
  /** Truncate domain row `label` in synthesis context JSON. */
  maxDomainLabelChars: 80,
  /** Soft cap on serialized user JSON; payload is truncated with a marker when exceeded. */
  maxUserJsonChars: 100_000,
  maxDominantConstraintChars: 240,
  maxConstraintChainItems: 8,
  maxConstraintChainItemChars: 160,
  maxOrchestrationNotesChars: 2_000,
  maxConflictsFromModel: 24,
  maxConflictSummaryChars: 800,
  maxConflictRawIdChars: 128,
} as const;
