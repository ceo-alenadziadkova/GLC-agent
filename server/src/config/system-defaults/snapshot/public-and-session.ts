export const SYSTEM_DEFAULTS_SNAPSHOT_PUBLIC = {
  freeSnapshotTokenBudget: 80_000,
  tokenTtlHours: 72,
  guestFunnelRetentionDays: 90,
  guestHeaderMaxLen: 2000,
  uxSummaryMaxChars: 280,
  competitorTimeoutMs: 3000,
} as const;

export const SYSTEM_DEFAULTS_SNAPSHOT_GUEST_SESSION = {
  cookieName: 'glc_snapshot_guest',
  maxAgeSec: 90 * 24 * 60 * 60,
  tokenBytes: 32,
} as const;
