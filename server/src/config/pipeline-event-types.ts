export const PIPELINE_EVENT_TYPES = {
  log: 'log',
  started: 'started',
  completed: 'completed',
  error: 'error',
  parallelStarted: 'parallel_started',
  parallelCompleted: 'parallel_completed',
  partialFailure: 'partial_failure',
  tokenUsage: 'token_usage',
  controlObject: 'control_object',
  refineRecommended: 'refine_recommended',
  qualityGate: 'quality_gate',
  cancelled: 'cancelled',
  reviewApproved: 'review_approved',
  reviewNeeded: 'review_needed',
  phaseStalled: 'phase_stalled',
} as const;

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
