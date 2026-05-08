/**
 * Policy for Strategy phase initiatives (v2) and execution packs.
 * Single source for enums, limits, scoring weights, and brief question id wiring.
 */

import { DOMAIN_KEYS } from '@glc/intake-core';

/** Stored on `audit_strategy.schema_version`. */
export const STRATEGY_INITIATIVE_SCHEMA_VERSION = {
  v1: 1,
  v2: 2,
} as const;

/** Intake question ids used to infer constraints / stage (see question-bank.v1.json). */
export const STRATEGY_BRIEF_SIGNAL_QUESTION_IDS = {
  businessStage: 'a7',
  teamSize: 'a4',
  budgetRange: 'f5',
  changeReadiness: 'f4',
  doNotRecommend: 'f6',
  ideaProblemEvidence: 'f_idea_1',
  ideaIcpClarity: 'f_idea_2',
  ideaGtmTests: 'f_idea_3',
  ideaLaunchConstraint: 'f_idea_4',
} as const;

/** Initiative domain: audit domains plus cross-cutting labels for roadmap items. */
export const STRATEGY_INITIATIVE_DOMAIN_KEYS = [
  ...DOMAIN_KEYS,
  'cross_domain',
  'operations',
  'finance',
  'sales',
  'customer_success',
  /** Discovery, validation, experiments — maps to `research` orchestration lane. */
  'research',
] as const;

export type StrategyInitiativeDomainKey = (typeof STRATEGY_INITIATIVE_DOMAIN_KEYS)[number];

export const STRATEGY_COMPANY_STAGES = [
  'idea',
  'mvp',
  'growth',
  'scale',
  'stabilization',
] as const;

export type StrategyCompanyStage = (typeof STRATEGY_COMPANY_STAGES)[number];

const STRATEGY_COMPANY_STAGE_ACCEPT_SET = new Set<string>(STRATEGY_COMPANY_STAGES);

/**
 * Map tool outputs that use near-synonyms outside the JSON schema enum to a canonical stage.
 * Extend only for high-frequency, low-ambiguity slips (token-safe repair before Zod).
 */
export const STRATEGY_COMPANY_STAGE_TOOL_COERCIONS: Readonly<
  Record<string, StrategyCompanyStage>
> = {
  launching: 'mvp',
  launch: 'mvp',
};

/**
 * Normalize `StrategyInitiative.stage` before `StrategyOutputSchema.safeParse`.
 */
export function coerceStrategyCompanyStageForTool(raw: unknown): unknown {
  if (typeof raw !== 'string') return raw;
  const key = raw.trim().toLowerCase().replace(/-/g, '_').replace(/\s+/g, '_');
  if (!key.length) return raw;
  if (STRATEGY_COMPANY_STAGE_ACCEPT_SET.has(key)) return key;
  const mapped = STRATEGY_COMPANY_STAGE_TOOL_COERCIONS[key];
  return mapped ?? raw;
}

export const STRATEGY_INITIATIVE_PRIORITIES = ['low', 'medium', 'high', 'critical'] as const;

export const STRATEGY_EXECUTION_PATH_TYPES = ['fast', 'balanced', 'scalable'] as const;

/** Normalized budget band from brief (f5) for constraint rules. */
export const STRATEGY_CONSTRAINT_BUDGET_BANDS = ['unknown', 'low', 'medium', 'high'] as const;
export type StrategyConstraintBudgetBand = (typeof STRATEGY_CONSTRAINT_BUDGET_BANDS)[number];

/** Normalized team scale from brief (a4). */
export const STRATEGY_CONSTRAINT_TEAM_SCALES = ['solo', 'small', 'medium', 'large', 'enterprise', 'unknown'] as const;
export type StrategyConstraintTeamScale = (typeof STRATEGY_CONSTRAINT_TEAM_SCALES)[number];

export const STRATEGY_INITIATIVE_LIMITS = {
  idMaxLength: 64,
  titleMinLength: 3,
  titleMaxLength: 200,
  descriptionMaxLength: 2500,
  bulletMaxLength: 420,
  contextSignalsMin: 1,
  contextSignalsMax: 10,
  contextProblemsMax: 8,
  contextRisksMax: 8,
  whyThisMin: 1,
  whyThisMax: 6,
  ifSkippedMax: 6,
  tradeoffsMax: 6,
  scopeIncludesMin: 1,
  scopeIncludesMax: 14,
  scopeExcludesMin: 1,
  scopeExcludesMax: 14,
  dependenciesMax: 12,
  evidenceSourcesMax: 10,
  crossDomainDependenciesMax: 12,
  executionPathsMin: 1,
  executionPathsMax: 3,
  pathDescriptionMaxLength: 900,
  pathTimeEstimateMaxLength: 80,
  pathToolsMax: 12,
  pathToolNameMaxLength: 64,
  pathStepsMax: 16,
  pathStepMaxLength: 240,
  alternativesMax: 6,
  alternativeNameMaxLength: 120,
  alternativeBulletsMax: 8,
  alternativeBulletMaxLength: 200,
  readinessBlockersMax: 10,
  readinessBlockerMaxLength: 200,
  outcomeDescriptionMaxLength: 800,
  outcomeTimeframeMaxLength: 120,
  confidenceMin: 0,
  confidenceMax: 1,
} as const;

/** Weights for client-side ROI-like sort: higher impact and lower effort score higher. */
export const STRATEGY_INITIATIVE_SORT_WEIGHTS = {
  impactHigh: 4,
  impactMedium: 2,
  impactLow: 1,
  effortLowBonus: 3,
  effortMediumBonus: 1,
  effortHighBonus: 0,
  criticalPriorityBonus: 2,
  highPriorityBonus: 1,
} as const;

/** When budget is low, mark scalable paths incompatible (constraint engine). */
export const STRATEGY_PATH_INCOMPATIBILITY: {
  budgetBandsThatRejectScalable: readonly StrategyConstraintBudgetBand[];
} = {
  budgetBandsThatRejectScalable: ['low'],
};

/** Token log phase for execution-pack Claude calls (post-audit interactive). */
export const STRATEGY_EXECUTION_PACK_TOKEN_PHASE = 7 as const;

/** Claude tool name for execution pack structured output (distinct from domain `submit_analysis`). */
export const STRATEGY_EXECUTION_PACK_CLAUDE_TOOL_NAME = 'submit_execution_pack' as const;

export const STRATEGY_EXECUTION_PACK_LIMITS = {
  maxInitiativesPerRequest: 5,
  architectureMaxLength: 4000,
  taskMaxLength: 500,
  tasksMax: 35,
  artifactMaxLength: 400,
  artifactsMax: 20,
  templateMaxLength: 400,
  templatesMax: 15,
  promptMaxLength: 8000,
  promptsMax: 12,
  outcomeMetricMaxLength: 400,
  baselineMaxLength: 400,
  reviewCadenceMaxLength: 120,
} as const;

/** Map intake business stage (a7) answers to initiative `stage` enum. */
export const STRATEGY_BUSINESS_STAGE_TO_COMPANY_STAGE: Readonly<
  Record<string, StrategyCompanyStage>
> = {
  Launching: 'idea',
  'Growing fast': 'growth',
  Stabilising: 'stabilization',
  Scaling: 'scale',
  'Mature and optimising': 'scale',
} as const;

/** Map budget range (f5) labels to budget band (substring match fallback in service). */
export const STRATEGY_BUDGET_RANGE_ORDER: readonly string[] = [
  'Under €500',
  '€500–2,000',
  '€2,000–10,000',
  'Over €10,000',
] as const;

/** Defaults when coercing legacy (v1) initiatives from older audits. */
export const STRATEGY_LEGACY_COERCE_DEFAULTS: {
  domain: StrategyInitiativeDomainKey;
  stage: StrategyCompanyStage;
  confidence: number;
  priority: (typeof STRATEGY_INITIATIVE_PRIORITIES)[number];
} = {
  domain: 'cross_domain',
  stage: 'growth',
  confidence: 0.55,
  priority: 'medium',
};
