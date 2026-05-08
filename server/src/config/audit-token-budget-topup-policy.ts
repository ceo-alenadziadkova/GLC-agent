/**
 * Static policy for platform-admin token-budget top-ups on a single audit.
 *
 * - `PRESETS` drives both server validation hints and the UI quick buttons.
 * - `MAX_DELTA` caps a single grant; multiple grants are still allowed.
 * - `LOW_PCT` is the proactive warning threshold (UI mirror lives in
 *   `src/app/pages/pipeline-monitor/config/pipeline-monitor-ui-policy.ts`).
 *
 * See `server/migrations/076_audit_token_budget_topup.sql` for the durable
 * grant log and atomic RPC, and `docs/PIPELINE.md` for the operator flow.
 */

export const AUDIT_TOKEN_BUDGET_TOPUP_PRESETS = [50_000, 100_000, 200_000] as const;

export const AUDIT_TOKEN_BUDGET_TOPUP_MIN_DELTA = 1_000 as const;

export const AUDIT_TOKEN_BUDGET_TOPUP_MAX_DELTA = 500_000 as const;

export const AUDIT_TOKEN_BUDGET_TOPUP_REASON_MAX_LEN = 500 as const;

/** Show the admin top-up suggestion when remaining budget falls to or below this percentage. */
export const AUDIT_TOKEN_BUDGET_LOW_PCT = 15 as const;

export type AuditTokenBudgetTopupPreset =
  (typeof AUDIT_TOKEN_BUDGET_TOPUP_PRESETS)[number];
