export const PIPELINE_EVENT_TYPES = {
  log: 'log',
  started: 'started',
  completed: 'completed',
  error: 'error',
  llmCallStarted: 'llm_call_started',
  llmCallCompleted: 'llm_call_completed',
  llmCallFailed: 'llm_call_failed',
  orchestrationStarted: 'orchestration_started',
  orchestrationCompleted: 'orchestration_completed',
  orchestrationError: 'orchestration_error',
  parallelStarted: 'parallel_started',
  parallelCompleted: 'parallel_completed',
  partialFailure: 'partial_failure',
  tokenUsage: 'token_usage',
  controlObject: 'control_object',
  refineRecommended: 'refine_recommended',
  qualityGate: 'quality_gate',
  cancelled: 'cancelled',
  /** Platform admin cleared `audits.status` from `cancelled` back to a claimable pause (`review`). */
  resumedFromCancelled: 'resumed_from_cancelled',
  /** Platform admin increased `audits.token_budget`; payload includes delta_tokens, previous_budget, new_budget. */
  tokenBudgetTopup: 'token_budget_topup',
  reviewApproved: 'review_approved',
  reviewNeeded: 'review_needed',
  phaseStalled: 'phase_stalled',
  /** Diagnostic intake KPI (ADR Sprint 3) — non-pipeline phase; consumers should filter by `event_type`. */
  intakeIntelligenceQuestionShown: 'intake_intelligence_question_shown',
  intakeIntelligenceAnswerChangedSignal: 'intake_intelligence_answer_changed_signal',
  intakeIntelligenceDropOff: 'intake_intelligence_drop_off',
  /** F1: deterministic `POST /api/intake/:token/next-question` decision (no LLM). */
  intakeIntelligenceNextQuestion: 'intake_intelligence_next_question',
  /** POST /api/intake/:token/intelligence-snapshot — F2 order + merge preview KPI (no pipeline phase). */
  intakeIntelligenceSnapshot: 'intake_intelligence_snapshot',
  /** POST /api/audits/:id/brief/intelligence-wording — B1 display phrasing / label overrides (second LLM pass). */
  intakeIntelligenceWording: 'intake_intelligence_wording',
  /** Delivery Board reconcile after orchestration pack bump (counts only; no task text). */
  planBoardReconciled: 'plan_board_reconciled',
  planBoardViewOpened: 'plan_board_view_opened',
  planBoardCardMoved: 'plan_board_card_moved',
  planBoardCardPinned: 'plan_board_card_pinned',
  planBoardConflict409: 'plan_board_conflict_409',
} as const;

export const PIPELINE_LOG_DETAIL_LEVELS = {
  default: 'default',
  debug: 'debug',
} as const;

export type PipelineLogDetailLevel = (typeof PIPELINE_LOG_DETAIL_LEVELS)[keyof typeof PIPELINE_LOG_DETAIL_LEVELS];

export const PIPELINE_LIFECYCLE_EVENT_TYPES = [
  PIPELINE_EVENT_TYPES.started,
  PIPELINE_EVENT_TYPES.completed,
  PIPELINE_EVENT_TYPES.error,
] as const;

export const PIPELINE_NOTIFY_EVENT_TYPES = [
  ...PIPELINE_LIFECYCLE_EVENT_TYPES,
  PIPELINE_EVENT_TYPES.reviewNeeded,
] as const;

export type PipelineLifecycleEventType = (typeof PIPELINE_LIFECYCLE_EVENT_TYPES)[number];
