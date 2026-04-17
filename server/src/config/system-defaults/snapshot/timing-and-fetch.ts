export const SYSTEM_DEFAULTS_SNAPSHOT_FETCH_BUDGET_MS = 10_000;

export const SYSTEM_DEFAULTS_SNAPSHOT_TIMING = {
  fetchMinRemainingMs: 800,
  fetchSinglePageBudgetCapMs: 8000,
  headMinRemainingMs: 500,
  headBudgetCapMs: 3500,
  robotsAbortMinMs: 500,
  robotsAbortMaxMs: 2500,
  maxExtraPages: 3,
  maxDiscoveryLinks: 80,
  maxHtmlBytes: 3_000_000,
  playwrightRemainingReserveMs: 1200,
  playwrightMinBudgetMs: 4500,
  crawlDelayRoomSubtractMs: 400,
  pwBudgetSubtractMs: 2000,
  pwNavTimeoutMinMs: 4000,
  pwNavTimeoutMaxMs: 25_000,
  pwSettleMinMs: 300,
  pwSettleMaxMs: 2000,
  pwVisibleTextMinChars: 280,
  pwVisibleTextRatio: 1.1,
  pwVisibleShortBeforeMax: 220,
  pwVisibleShortGainMin: 80,
  axeNavTimeoutMinMs: 4000,
  axeNavTimeoutMaxMs: 30_000,
} as const;

export const SYSTEM_DEFAULTS_SNAPSHOT_TIERED_FETCH = {
  playwrightEnabled: true,
  playwrightBudgetMs: 14_000,
  robotsHeadRetryBrowserUa: false,
} as const;
