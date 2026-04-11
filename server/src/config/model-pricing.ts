/**
 * Per-million-token USD rates for cost estimates (token-tracker).
 * Tune in this module when vendor list prices change.
 */

import { CLAUDE_MODEL } from './model.js';

const MODEL_PRICING: Record<string, { input: number; output: number }> = {
  [CLAUDE_MODEL]: { input: 3.0, output: 15.0 },
  'claude-haiku-4-5-20251001': { input: 0.8, output: 4.0 },
  'claude-opus-4-20250514': { input: 15.0, output: 75.0 },
};

/** Returns pricing for the given model ID, falling back to pipeline default model rates. */
export function getModelPricing(model: string): { input: number; output: number } {
  return MODEL_PRICING[model] ?? MODEL_PRICING[CLAUDE_MODEL];
}
