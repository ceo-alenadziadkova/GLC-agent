/**
 * USD cost rounding for token usage events — source: `SYSTEM_DEFAULTS.tokenTracker`.
 */

import { SYSTEM_DEFAULTS } from './system-defaults.js';

const USD_ROUND_MULT = 10 ** SYSTEM_DEFAULTS.tokenTracker.costUsdDecimalPlaces;

export function roundTokenCostUsd(costUsd: number): number {
  return Math.round(costUsd * USD_ROUND_MULT) / USD_ROUND_MULT;
}
