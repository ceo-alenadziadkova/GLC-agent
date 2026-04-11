/**
 * Snapshot fetch / Playwright / axe timeouts and caps.
 * Source of truth: `SYSTEM_DEFAULTS.snapshotTiming`.
 */

import { SYSTEM_DEFAULTS } from './system-defaults.js';

const T = SYSTEM_DEFAULTS.snapshotTiming;

export const SNAPSHOT_FETCH_MIN_REMAINING_MS = T.fetchMinRemainingMs;

export const SNAPSHOT_FETCH_SINGLE_PAGE_BUDGET_CAP_MS = T.fetchSinglePageBudgetCapMs;

export const SNAPSHOT_HEAD_MIN_REMAINING_MS = T.headMinRemainingMs;

export const SNAPSHOT_HEAD_BUDGET_CAP_MS = T.headBudgetCapMs;

export const SNAPSHOT_ROBOTS_ABORT_MIN_MS = T.robotsAbortMinMs;

export const SNAPSHOT_ROBOTS_ABORT_MAX_MS = T.robotsAbortMaxMs;

export const SNAPSHOT_MAX_EXTRA_PAGES = T.maxExtraPages;

export const SNAPSHOT_MAX_DISCOVERY_LINKS = T.maxDiscoveryLinks;

export const SNAPSHOT_MAX_HTML_BYTES = T.maxHtmlBytes;

export const SNAPSHOT_PLAYWRIGHT_REMAINING_RESERVE_MS = T.playwrightRemainingReserveMs;

export const SNAPSHOT_PLAYWRIGHT_MIN_BUDGET_MS = T.playwrightMinBudgetMs;

export const SNAPSHOT_CRAWL_DELAY_ROOM_SUBTRACT_MS = T.crawlDelayRoomSubtractMs;

export const SNAPSHOT_PW_BUDGET_SUBTRACT_MS = T.pwBudgetSubtractMs;
export const SNAPSHOT_PW_NAV_TIMEOUT_MIN_MS = T.pwNavTimeoutMinMs;
export const SNAPSHOT_PW_NAV_TIMEOUT_MAX_MS = T.pwNavTimeoutMaxMs;

export const SNAPSHOT_PW_SETTLE_MIN_MS = T.pwSettleMinMs;
export const SNAPSHOT_PW_SETTLE_MAX_MS = T.pwSettleMaxMs;

export const SNAPSHOT_PW_VISIBLE_TEXT_MIN_CHARS = T.pwVisibleTextMinChars;

export const SNAPSHOT_PW_VISIBLE_TEXT_RATIO = T.pwVisibleTextRatio;

export const SNAPSHOT_PW_VISIBLE_SHORT_BEFORE_MAX = T.pwVisibleShortBeforeMax;

export const SNAPSHOT_PW_VISIBLE_SHORT_GAIN_MIN = T.pwVisibleShortGainMin;

export const SNAPSHOT_AXE_NAV_TIMEOUT_MIN_MS = T.axeNavTimeoutMinMs;

export const SNAPSHOT_AXE_NAV_TIMEOUT_MAX_MS = T.axeNavTimeoutMaxMs;
