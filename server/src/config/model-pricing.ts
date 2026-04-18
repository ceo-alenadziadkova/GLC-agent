/**
 * Per-million-token USD rates for cost estimates (token-tracker).
 * Single lookup table: default pipeline model + alternates from `SYSTEM_DEFAULTS`.
 */

import { SYSTEM_DEFAULTS } from './system-defaults.js';

const P = SYSTEM_DEFAULTS.pipelineModel;

/** All known model IDs -> rates (default model id must stay in sync with `pipelineModel.claudeModelId`). */
const USD_PER_MTOK_BY_MODEL: Record<string, { input: number; output: number }> = {
  [P.claudeModelId]: P.usdPerMillionTokens,
  ...SYSTEM_DEFAULTS.anthropicAlternateModelPricingUsdPerMtok,
};

const DEFAULT_RATES = P.usdPerMillionTokens;

/** Returns pricing for the given model ID; falls back to default pipeline model rates if unknown. */
export function getModelPricing(model: string): { input: number; output: number } {
  return USD_PER_MTOK_BY_MODEL[model] ?? DEFAULT_RATES;
}
