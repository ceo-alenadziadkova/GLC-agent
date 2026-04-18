import type { DataQualityWeights } from './types.js';

export const UNKNOWN_QUESTION_BANK_ORDER_FALLBACK = 9999;

export const SCORE_BAND_THRESHOLDS_FROM_1_TO_5 = {
  excellentMinInclusive: 4.5,
  goodMinInclusive: 3.5,
  moderateMinInclusive: 2.5,
  needsWorkMinInclusive: 1.5,
} as const;

export const DEFAULT_DATA_QUALITY_WEIGHTS: DataQualityWeights = {
  required: 0.55,
  recommended: 0.35,
  optional: 0.1,
};
