/**
 * Tunables for persisted `audits.plan_board_column_policy` (Epic 3).
 * @see ADR-PLAN-BOARD-CUSTOM-COLUMNS-EPIC3.md
 */
export const PLAN_BOARD_COLUMN_POLICY_LIMITS = {
  schemaVersion: 1,
  minSemanticColumns: 6,
  maxColumns: 16,
  maxIdLength: 48,
  maxTitleLength: 120,
  columnIdPattern: /^[a-z][a-z0-9_]*$/,
} as const;
