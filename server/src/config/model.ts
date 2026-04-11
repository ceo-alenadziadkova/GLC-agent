/**
 * Centralized Anthropic model configuration.
 * Source of truth: `SYSTEM_DEFAULTS.pipelineModel`.
 *
 * Never hardcode the model string anywhere else — always import `CLAUDE_MODEL` from here.
 */

import { SYSTEM_DEFAULTS } from './system-defaults.js';

const P = SYSTEM_DEFAULTS.pipelineModel;

export const CLAUDE_MODEL = P.claudeModelId;

/** Minimum remaining token reserve before refusing to start a new Claude call. */
export const MIN_TOKEN_RESERVE = P.minTokenReserve;

/** Emit a 'warning' pipeline event when usage crosses this fraction. */
export const BUDGET_WARNING_THRESHOLD = P.budgetWarningThreshold;

/** Claude max_tokens per agent type. */
export const MODEL_MAX_TOKENS = {
  domain: P.maxTokensDomain,
  strategy: P.maxTokensStrategy,
  recon: P.maxTokensRecon,
} as const;

export { getModelPricing } from './model-pricing.js';
