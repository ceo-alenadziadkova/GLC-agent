import { SYSTEM_DEFAULTS } from './system-defaults.js';

export const DEFAULT_SNAPSHOT_FETCH_BUDGET_MS = SYSTEM_DEFAULTS.snapshotFetchBudgetMs;

export function getSnapshotFetchBudgetMs(): number {
  return SYSTEM_DEFAULTS.snapshotFetchBudgetMs;
}
