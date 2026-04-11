/**
 * Full-audit crawler (phase 0) limits — env-tunable without code changes.
 */

import { parsePositiveIntFromEnv } from './rate-limits.js';
import { SYSTEM_DEFAULTS } from './system-defaults.js';

const C = SYSTEM_DEFAULTS.crawler;

const CRAWLER_MAX_PAGES_RAW = parsePositiveIntFromEnv(process.env.CRAWLER_MAX_PAGES, C.maxPages);

/** Hard cap prevents misconfiguration from unbounded crawl cost. */
export const CRAWLER_MAX_PAGES = Math.min(C.maxPagesHardCap, Math.max(1, CRAWLER_MAX_PAGES_RAW));

/** Per-page fetch abort timeout (ms). */
export const CRAWLER_PAGE_TIMEOUT_MS = parsePositiveIntFromEnv(
  process.env.CRAWLER_PAGE_TIMEOUT_MS,
  C.pageTimeoutMs,
);

/** Wall-clock budget for the entire crawl loop (ms). */
export const CRAWLER_TOTAL_BUDGET_MS = parsePositiveIntFromEnv(
  process.env.CRAWLER_TOTAL_BUDGET_MS,
  C.totalBudgetMs,
);
