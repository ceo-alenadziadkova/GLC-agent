/**
 * Per-million-token USD rates for cost estimates (token-tracker).
 * Source: `SYSTEM_DEFAULTS.pipelineModel.usdPerMillionTokens` + `anthropicAlternateModelPricingUsdPerMtok`.
 */

import { SYSTEM_DEFAULTS } from './system-defaults.js';
import { CLAUDE_MODEL } from './model.js';

const primary = SYSTEM_DEFAULTS.pipelineModel.usdPerMillionTokens;
const alternate = SYSTEM_DEFAULTS.anthropicAlternateModelPricingUsdPerMtok;

/** Returns pricing for the given model ID, falling back to pipeline default model rates. */
export function getModelPricing(model: string): { input: number; output: number } {
  if (model === CLAUDE_MODEL) return primary;
  const alt = alternate[model as keyof typeof alternate];
  if (alt) return alt;
  return primary;
}
