/**
 * Human-readable `pipeline_events.message` for `token_usage` rows (English).
 * Decimal places align with `SYSTEM_DEFAULTS.tokenTracker.costUsdDecimalPlaces`.
 */

import { SYSTEM_DEFAULTS } from './system-defaults.js';

export function formatTokenUsagePipelineEventMessage(input: {
  phase: number;
  totalTokens: number;
  costUsd: number;
}): string {
  const places = SYSTEM_DEFAULTS.tokenTracker.costUsdDecimalPlaces;
  return `Phase ${input.phase}: ${input.totalTokens} tokens ($${input.costUsd.toFixed(places)})`;
}
