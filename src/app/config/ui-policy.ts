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
  },
  snapshotLanding: {
    maxDetectedTechPills: 12,
    maxTentativeTechPills: 8,
  },
} as const;
