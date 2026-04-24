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
