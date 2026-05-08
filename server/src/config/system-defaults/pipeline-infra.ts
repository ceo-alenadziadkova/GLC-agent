export const SYSTEM_DEFAULTS_PIPELINE_ORCHESTRATOR = {
  stalledPhaseTimeoutMin: 15,
  parallelFailureThreshold: 2,
  completedDomainReadRetryMaxAttempts: 3,
  completedDomainReadRetryBaseDelayMs: 150,
  completedDomainReadRetryJitterMs: 100,
} as const;

export const SYSTEM_DEFAULTS_PIPELINE_WORKER = {
  leaseTtlSeconds: 60,
  heartbeatMs: 10_000,
  concurrency: 2,
} as const;

export const SYSTEM_DEFAULTS_PIPELINE_QUEUE = {
  removeOnComplete: 1000,
  removeOnFail: 1000,
  jobAttempts: 3,
} as const;
