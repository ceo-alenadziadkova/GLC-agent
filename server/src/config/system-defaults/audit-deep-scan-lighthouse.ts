export const SYSTEM_DEFAULTS_AUDIT_DEEP_SCAN = {
  deepScanEnabled: false,
  lighthouseEnabled: false,
  axePlaywrightEnabled: false,
  lighthouseBudgetMsDefault: 55_000,
  lighthouseBudgetMsMin: 10_000,
  lighthouseBudgetMsMax: 120_000,
  axeNavigateTimeoutMsDefault: 12_000,
  axeNavigateTimeoutMsMin: 4000,
  axeNavigateTimeoutMsMax: 30_000,
} as const;

/**
 * Headless Lighthouse `maxWaitForLoad` clamp in `runLighthouseAuditSummary` (floor / cap around caller `budgetMs`).
 * Narrower than `auditDeepScan` budget bounds: this caps a single Lighthouse CLI run, not the full deep-scan budget range.
 */
export const SYSTEM_DEFAULTS_LIGHTHOUSE_RUN = {
  maxWaitForLoadClampMinMs: 8000,
  maxWaitForLoadClampMaxMs: 55_000,
  /**
   * Headless Chrome flags passed to `chrome-launcher` in `runLighthouseAuditSummary`.
   * Tune for container/CI constraints alongside Lighthouse budgets above.
   */
  chromeLauncherFlags: [
    '--headless',
    '--no-sandbox',
    '--disable-gpu',
    '--disable-dev-shm-usage',
  ] as const,
  /** Lighthouse `onlyCategories` passed to the Node API. */
  onlyCategories: ['performance', 'accessibility', 'best-practices', 'seo'] as const,
  /** When `lhr` is missing after a run. */
  noReportErrorMessage: 'Lighthouse returned no report',
} as const;
