/**
 * Strategy Lab constraint enums for UI selects.
 * Keep aligned with `STRATEGY_COMPANY_STAGES`, `STRATEGY_CONSTRAINT_BUDGET_BANDS`,
 * `STRATEGY_CONSTRAINT_TEAM_SCALES` in `server/src/config/strategy-initiative-policy.ts`.
 */
export const STRATEGY_LAB_UI_COMPANY_STAGES = [
  'idea',
  'mvp',
  'growth',
  'scale',
  'stabilization',
] as const;

export const STRATEGY_LAB_UI_BUDGET_BANDS = ['unknown', 'low', 'medium', 'high'] as const;

export const STRATEGY_LAB_UI_TEAM_SCALES = [
  'solo',
  'small',
  'medium',
  'large',
  'enterprise',
  'unknown',
] as const;

export type StrategyLabUiCompanyStage = (typeof STRATEGY_LAB_UI_COMPANY_STAGES)[number];
export type StrategyLabUiBudgetBand = (typeof STRATEGY_LAB_UI_BUDGET_BANDS)[number];
export type StrategyLabUiTeamScale = (typeof STRATEGY_LAB_UI_TEAM_SCALES)[number];
