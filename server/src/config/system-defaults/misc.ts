export const SYSTEM_DEFAULTS_IDEMPOTENCY = {
  ttlHours: 24,
} as const;

/** Length caps for `upgradeFreeSnapshotAudit` scraped-context prefill (not CMS copy). */
export const SYSTEM_DEFAULTS_UPGRADE_FREE_SNAPSHOT_PREFILL = {
  industrySpecifyMaxChars: 200,
  uxRowSummarySoftMaxChars: 400,
  uxRowSummarySliceChars: 397,
  businessActivityBlurbMaxChars: 1200,
  reconPrefillTechStackLinesMax: 40,
} as const;
