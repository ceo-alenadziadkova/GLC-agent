/**
 * Centralized Anthropic model configuration.
 *
 * Override env vars for A/B testing, fallback, or cost control:
 *   ANTHROPIC_MODEL=claude-haiku-4-5-20251001   # cheaper / faster
 *   ANTHROPIC_MODEL=claude-opus-4-20250514       # more capable
 *
 * Optional cost table overrides (merge JSON keys over defaults):
 *   ANTHROPIC_PRICING_JSON={"claude-sonnet-4-20250514":{"input":3,"output":15}}
 *
 * Never hardcode the model string anywhere else in the codebase — always
 * import CLAUDE_MODEL from here so a single env change propagates everywhere.
 */
import { parsePositiveIntFromEnv } from './rate-limits.js';

export const CLAUDE_MODEL =
  process.env.ANTHROPIC_MODEL ?? 'claude-sonnet-4-20250514';

// ─── Token budget constants ───────────────────────────────────────────────

function readMinTokenReserve(): number {
  const n = Number(process.env.PIPELINE_MIN_TOKEN_RESERVE ?? 10_000);
  return Number.isFinite(n) && n >= 0 ? Math.floor(n) : 10_000;
}

/**
 * Minimum remaining token reserve before we refuse to start a new Claude call.
 * Prevents a phase from consuming the very last tokens and leaving nothing
 * for error events or the next phase's overhead.
 */
export const MIN_TOKEN_RESERVE = readMinTokenReserve();

/**
 * Emit a 'warning' pipeline event when usage crosses this fraction.
 * Does NOT stop execution — just surfaces to the frontend.
 */
export const BUDGET_WARNING_THRESHOLD = (() => {
  const n = Number(process.env.PIPELINE_BUDGET_WARNING_THRESHOLD);
  if (Number.isFinite(n) && n > 0 && n <= 1) return n;
  return 0.8;
})();

// ─── Per-agent max_tokens limits ─────────────────────────────────────────

/** Claude max_tokens per agent type.  Strategy needs more output due to long executive summary. */
export const MODEL_MAX_TOKENS = {
  domain: parsePositiveIntFromEnv(process.env.PIPELINE_MODEL_MAX_TOKENS_DOMAIN, 4_096),
  strategy: parsePositiveIntFromEnv(process.env.PIPELINE_MODEL_MAX_TOKENS_STRATEGY, 8_192),
  recon: parsePositiveIntFromEnv(process.env.PIPELINE_MODEL_MAX_TOKENS_RECON, 4_096),
} as const;

export { getModelPricing } from './model-pricing.js';
