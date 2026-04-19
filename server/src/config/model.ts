/**
 * Centralized Anthropic model configuration.
 * Default: `SYSTEM_DEFAULTS.pipelineModel.claudeModelId`.
 * Documented ops exception (no release): `PIPELINE_CLAUDE_MODEL_ID` or `ANTHROPIC_MODEL` (first non-empty wins).
 * See `server/.env.example` — "Documented ops exceptions".
 *
 * Never hardcode the model string anywhere else — always import `CLAUDE_MODEL` from here.
 */

import { SYSTEM_DEFAULTS } from './system-defaults.js';

const P = SYSTEM_DEFAULTS.pipelineModel;

function resolveClaudeModelIdFromEnv(): string {
  const a = process.env.PIPELINE_CLAUDE_MODEL_ID?.trim();
  if (a) return a;
  const b = process.env.ANTHROPIC_MODEL?.trim();
  if (b) return b;
  return '';
}

export const CLAUDE_MODEL = resolveClaudeModelIdFromEnv() || P.claudeModelId;

/** Minimum remaining token reserve before refusing to start a new Claude call. */
export const MIN_TOKEN_RESERVE = P.minTokenReserve;

/** Emit a 'warning' pipeline event when usage crosses this fraction. */
export const BUDGET_WARNING_THRESHOLD = P.budgetWarningThreshold;

/** Claude max_tokens per agent type. */
export const MODEL_MAX_TOKENS = {
  domain: P.maxTokensDomain,
  strategy: P.maxTokensStrategy,
  strategyExecutionPack: P.maxTokensStrategyExecutionPack,
  recon: P.maxTokensRecon,
} as const;

export { getModelPricing } from './model-pricing.js';
