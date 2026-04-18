/**
 * Claude context assembly limits for collected raw JSON (`ContextBuilder`).
 * Source: `SYSTEM_DEFAULTS.contextBuilder`.
 */

import { SYSTEM_DEFAULTS } from './system-defaults.js';

const C = SYSTEM_DEFAULTS.contextBuilder;

export const CONTEXT_BUILDER_MAX_RAW_CHARS_PER_COLLECTOR = C.maxRawCharsPerCollector;

export const CONTEXT_BUILDER_MAX_TOTAL_RAW_CHARS = C.maxTotalRawChars;

export const CONTEXT_BUILDER_TRIM_MIN_OBJECT_CHARS = C.trimMinObjectChars;

export const CONTEXT_BUILDER_TRIM_ARRAY_HALVE_MIN_LENGTH = C.trimArrayHalveMinLength;

export const CONTEXT_BUILDER_TRIM_ARRAY_SIZE_FRACTION_OF_MAX = C.trimArraySizeFractionOfMax;

export const CONTEXT_BUILDER_DEFAULT_BRIEF_RESPONSE_SOURCE = C.defaultBriefResponseSource;

/** Sort key for brief entries missing from the bank order index (stable tail). */
export const BRIEF_ENTRY_SORT_FALLBACK_ORDER = 9999;
