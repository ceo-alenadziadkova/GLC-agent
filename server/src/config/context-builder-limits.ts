/**
 * Claude context assembly limits for collected raw JSON (`ContextBuilder`).
 * Source: `SYSTEM_DEFAULTS.contextBuilder`.
 */

import { SYSTEM_DEFAULTS } from './system-defaults.js';

const C = SYSTEM_DEFAULTS.contextBuilder;

export const CONTEXT_BUILDER_MAX_RAW_CHARS_PER_COLLECTOR = C.maxRawCharsPerCollector;

export const CONTEXT_BUILDER_MAX_TOTAL_RAW_CHARS = C.maxTotalRawChars;
