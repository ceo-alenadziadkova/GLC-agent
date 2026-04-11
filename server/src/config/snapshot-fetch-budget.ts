import { SYSTEM_DEFAULTS } from './system-defaults.js';

/** ADR wall-clock target ~8–12s; default from `system-defaults` (override with SNAPSHOT_FETCH_BUDGET_MS). */
export const DEFAULT_SNAPSHOT_FETCH_BUDGET_MS = SYSTEM_DEFAULTS.snapshotFetchBudgetMs;

export function getSnapshotFetchBudgetMs(): number {
  const n = Number(process.env.SNAPSHOT_FETCH_BUDGET_MS ?? DEFAULT_SNAPSHOT_FETCH_BUDGET_MS);
  return Number.isFinite(n) && n > 0 ? n : DEFAULT_SNAPSHOT_FETCH_BUDGET_MS;
}
