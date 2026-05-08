/**
 * Frontend UI policy constants (non-secret, build-time static config).
 */
export const UI_POLICY = {
  login: {
    minPasswordLength: 8,
    desktopTwoColumnMinWidthPx: 1024,
  },
  pipeline: {
    maxEventsInMemory: 100,
    /** Above this row count the pipeline execution log uses a scroll-region virtualizer (aligned with hook memory cap intent). */
    executionLogVirtualizeRowThreshold: 28,
    defaultEventDetailLevel: 'default',
    debugEventDetailLevel: 'debug',
    defaultEventPageSize: 100,
    debugEventPageSize: 250,
  },
  snapshotLanding: {
    maxDetectedTechPills: 12,
    maxTentativeTechPills: 8,
  },
} as const;
