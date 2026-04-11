/** ADR wall-clock target ~8–12s; default 10s (override with SNAPSHOT_FETCH_BUDGET_MS). */
export const DEFAULT_SNAPSHOT_FETCH_BUDGET_MS = 10_000;

export function getSnapshotFetchBudgetMs(): number {
  const n = Number(process.env.SNAPSHOT_FETCH_BUDGET_MS ?? DEFAULT_SNAPSHOT_FETCH_BUDGET_MS);
  return Number.isFinite(n) && n > 0 ? n : DEFAULT_SNAPSHOT_FETCH_BUDGET_MS;
}
