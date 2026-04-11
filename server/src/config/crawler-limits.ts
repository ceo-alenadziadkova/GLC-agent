/**
 * Full-audit crawler (phase 0) limits.
 * Source of truth: `SYSTEM_DEFAULTS.crawler`.
 */

import { SYSTEM_DEFAULTS } from './system-defaults.js';

const C = SYSTEM_DEFAULTS.crawler;

/** Hard cap prevents misconfiguration from unbounded crawl cost. */
export const CRAWLER_MAX_PAGES = Math.min(C.maxPagesHardCap, Math.max(1, C.maxPages));

/** Per-page fetch abort timeout (ms). */
export const CRAWLER_PAGE_TIMEOUT_MS = C.pageTimeoutMs;

/** Wall-clock budget for the entire crawl loop (ms). */
export const CRAWLER_TOTAL_BUDGET_MS = C.totalBudgetMs;
