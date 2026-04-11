/**
 * Tunable snapshot fetch / Playwright / axe timeouts and caps (optional env overrides).
 * Prefix: SNAPSHOT_* — see docs/DEPLOYMENT.md.
 */

import { parsePositiveIntFromEnv } from './rate-limits.js';

function readPositiveMs(name: string, fallback: number): number {
  const n = Number(process.env[name]);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : fallback;
}

/** Minimum remaining wall clock before skipping an HTTP fetch attempt (default 800). */
export const SNAPSHOT_FETCH_MIN_REMAINING_MS = readPositiveMs('SNAPSHOT_FETCH_MIN_REMAINING_MS', 800);

/** Per-request HTTP budget cap when time remains (default 8000). */
export const SNAPSHOT_FETCH_SINGLE_PAGE_BUDGET_CAP_MS = readPositiveMs(
  'SNAPSHOT_FETCH_SINGLE_PAGE_BUDGET_CAP_MS',
  8000,
);

/** HEAD probe: skip if less than this ms left (default 500). */
export const SNAPSHOT_HEAD_MIN_REMAINING_MS = readPositiveMs('SNAPSHOT_HEAD_MIN_REMAINING_MS', 500);

/** HEAD probe per-attempt budget cap (default 3500). */
export const SNAPSHOT_HEAD_BUDGET_CAP_MS = readPositiveMs('SNAPSHOT_HEAD_BUDGET_CAP_MS', 3500);

/** Robots policy fetch: abort budget clamp min (default 500). */
export const SNAPSHOT_ROBOTS_ABORT_MIN_MS = readPositiveMs('SNAPSHOT_ROBOTS_ABORT_MIN_MS', 500);

/** Robots policy fetch: abort budget clamp max (default 2500). */
export const SNAPSHOT_ROBOTS_ABORT_MAX_MS = readPositiveMs('SNAPSHOT_ROBOTS_ABORT_MAX_MS', 2500);

/** Extra same-origin pages after homepage (default 3). */
export const SNAPSHOT_MAX_EXTRA_PAGES = parsePositiveIntFromEnv(process.env.SNAPSHOT_MAX_EXTRA_PAGES, 3);

/** Max links scanned from homepage HTML for discovery (default 80). */
export const SNAPSHOT_MAX_DISCOVERY_LINKS = parsePositiveIntFromEnv(process.env.SNAPSHOT_MAX_DISCOVERY_LINKS, 80);

/** Truncate HTML payloads larger than this many UTF-8 bytes (default 3_000_000). */
export const SNAPSHOT_MAX_HTML_BYTES = parsePositiveIntFromEnv(process.env.SNAPSHOT_MAX_HTML_BYTES, 3_000_000);

/** Reserve ms subtracted from remaining wall clock before Playwright budget (default 1200). */
export const SNAPSHOT_PLAYWRIGHT_REMAINING_RESERVE_MS = readPositiveMs(
  'SNAPSHOT_PLAYWRIGHT_REMAINING_RESERVE_MS',
  1200,
);

/** Minimum Playwright budget to attempt render (default 4500). */
export const SNAPSHOT_PLAYWRIGHT_MIN_BUDGET_MS = readPositiveMs('SNAPSHOT_PLAYWRIGHT_MIN_BUDGET_MS', 4500);

/** Crawl-delay wait: subtract this from remaining room (default 400). */
export const SNAPSHOT_CRAWL_DELAY_ROOM_SUBTRACT_MS = readPositiveMs('SNAPSHOT_CRAWL_DELAY_ROOM_SUBTRACT_MS', 400);

/** Playwright nav timeout: budget minus this, clamped (defaults 2000 / 4000 / 25000). */
export const SNAPSHOT_PW_BUDGET_SUBTRACT_MS = readPositiveMs('SNAPSHOT_PW_BUDGET_SUBTRACT_MS', 2000);
export const SNAPSHOT_PW_NAV_TIMEOUT_MIN_MS = readPositiveMs('SNAPSHOT_PW_NAV_TIMEOUT_MIN_MS', 4000);
export const SNAPSHOT_PW_NAV_TIMEOUT_MAX_MS = readPositiveMs('SNAPSHOT_PW_NAV_TIMEOUT_MAX_MS', 25_000);

/** Post-navigation settle (default min 300, max 2000, scale budget/6 in caller). */
export const SNAPSHOT_PW_SETTLE_MIN_MS = readPositiveMs('SNAPSHOT_PW_SETTLE_MIN_MS', 300);
export const SNAPSHOT_PW_SETTLE_MAX_MS = readPositiveMs('SNAPSHOT_PW_SETTLE_MAX_MS', 2000);

/** Playwright: accept rendered HTML if visible text >= max(minChars, before * ratio) (defaults 280, 1.1). */
export const SNAPSHOT_PW_VISIBLE_TEXT_MIN_CHARS = parsePositiveIntFromEnv(
  process.env.SNAPSHOT_PW_VISIBLE_TEXT_MIN_CHARS,
  280,
);
const ratioRaw = Number(process.env.SNAPSHOT_PW_VISIBLE_TEXT_RATIO ?? 1.1);
export const SNAPSHOT_PW_VISIBLE_TEXT_RATIO =
  Number.isFinite(ratioRaw) && ratioRaw > 1 ? ratioRaw : 1.1;

/** Short baseline: if before < this and after gains >= gainChars, accept (defaults 220 / 80). */
export const SNAPSHOT_PW_VISIBLE_SHORT_BEFORE_MAX = parsePositiveIntFromEnv(
  process.env.SNAPSHOT_PW_VISIBLE_SHORT_BEFORE_MAX,
  220,
);
export const SNAPSHOT_PW_VISIBLE_SHORT_GAIN_MIN = parsePositiveIntFromEnv(
  process.env.SNAPSHOT_PW_VISIBLE_SHORT_GAIN_MIN,
  80,
);

/** Axe Playwright goto timeout clamp (defaults 4000 / 30000). */
export const SNAPSHOT_AXE_NAV_TIMEOUT_MIN_MS = readPositiveMs('SNAPSHOT_AXE_NAV_TIMEOUT_MIN_MS', 4000);
export const SNAPSHOT_AXE_NAV_TIMEOUT_MAX_MS = readPositiveMs('SNAPSHOT_AXE_NAV_TIMEOUT_MAX_MS', 30_000);
