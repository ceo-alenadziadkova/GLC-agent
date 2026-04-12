/**
 * Human-readable log line tuning (`services/logger.ts` pretty format).
 */

/** Max length of stringified context on one line before switching to multiline JSON. */
export const LOG_PRETTY_CONTEXT_SINGLE_LINE_MAX = 160;

/** Default truncation length for trace / user / audit ids in pretty prefix. */
export const LOG_SHORT_ID_LEN_DEFAULT = 8;

/** Truncation length for `operation_id` in pretty prefix. */
export const LOG_SHORT_ID_LEN_OPERATION = 6;
