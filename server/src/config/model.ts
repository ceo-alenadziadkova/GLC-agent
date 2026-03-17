/**
 * Centralized Anthropic model configuration.
 *
 * Override env vars for A/B testing, fallback, or cost control:
 *   ANTHROPIC_MODEL=claude-haiku-4-5-20251001   # cheaper / faster
 *   ANTHROPIC_MODEL=claude-opus-4-20250514       # more capable
 *
 * Never hardcode the model string anywhere else in the codebase — always
 * import CLAUDE_MODEL from here so a single env change propagates everywhere.
 */
export const CLAUDE_MODEL =
  process.env.ANTHROPIC_MODEL ?? 'claude-sonnet-4-20250514';

// ─── Token budget constants ───────────────────────────────────────────────

/**
 * Minimum remaining token reserve before we refuse to start a new Claude call.
 * Prevents a phase from consuming the very last tokens and leaving nothing
 * for error events or the next phase's overhead.
 */
export const MIN_TOKEN_RESERVE = 10_000;

/**
 * Emit a 'warning' pipeline event when usage crosses this fraction.
 * Does NOT stop execution — just surfaces to the frontend.
 */
export const BUDGET_WARNING_THRESHOLD = 0.80;

// ─── Per-agent max_tokens limits ─────────────────────────────────────────

/** Claude max_tokens per agent type.  Strategy needs more output due to long executive summary. */
export const MODEL_MAX_TOKENS = {
  domain:   4_096,
  strategy: 8_192,
  recon:    4_096,
} as const;

// ─── Pricing ─────────────────────────────────────────────────────────────

const PRICING: Record<string, { input: number; output: number }> = {
  'claude-sonnet-4-20250514':    { input: 3.0,  output: 15.0 },
  'claude-haiku-4-5-20251001':   { input: 0.8,  output: 4.0  },
  'claude-opus-4-20250514':      { input: 15.0, output: 75.0 },
};

/** Returns pricing for the given model ID, falling back to Sonnet rates. */
export function getModelPricing(model: string): { input: number; output: number } {
  return PRICING[model] ?? PRICING['claude-sonnet-4-20250514'];
}
