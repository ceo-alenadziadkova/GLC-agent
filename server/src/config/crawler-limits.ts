/**
 * Full-audit crawler (phase 0) limits — env-tunable without code changes.
 */

import { parsePositiveIntFromEnv } from './rate-limits.js';

const CRAWLER_MAX_PAGES_RAW = parsePositiveIntFromEnv(process.env.CRAWLER_MAX_PAGES, 20);

/** Hard cap prevents misconfiguration from unbounded crawl cost. */
export const CRAWLER_MAX_PAGES = Math.min(100, Math.max(1, CRAWLER_MAX_PAGES_RAW));

/** Per-page fetch abort timeout (ms). */
export const CRAWLER_PAGE_TIMEOUT_MS = parsePositiveIntFromEnv(
  process.env.CRAWLER_PAGE_TIMEOUT_MS,
  15_000,
);

/** Wall-clock budget for the entire crawl loop (ms). */
export const CRAWLER_TOTAL_BUDGET_MS = parsePositiveIntFromEnv(
  process.env.CRAWLER_TOTAL_BUDGET_MS,
  90_000,
);
