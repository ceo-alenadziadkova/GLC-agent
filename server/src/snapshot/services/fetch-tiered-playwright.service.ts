import * as cheerio from 'cheerio';

import { SYSTEM_DEFAULTS } from '../../config/system-defaults.js';
import {
  SNAPSHOT_PLAYWRIGHT_MIN_BUDGET_MS,
  SNAPSHOT_PLAYWRIGHT_REMAINING_RESERVE_MS,
  SNAPSHOT_PW_VISIBLE_SHORT_BEFORE_MAX,
  SNAPSHOT_PW_VISIBLE_SHORT_GAIN_MIN,
  SNAPSHOT_PW_VISIBLE_TEXT_MIN_CHARS,
  SNAPSHOT_PW_VISIBLE_TEXT_RATIO,
} from '../../config/snapshot-timing.js';
import { logger } from '../../services/logger.js';
import type { FetchedPage } from '../types.js';
import { truncateHtml } from './http/snapshot-http-fetch.service.js';

function visibleTextLength(html: string): number {
  const $ = cheerio.load(html);
  const text = ($('main').text() || $('article').text() || $('body').text()).replace(/\s+/g, ' ').trim();
  return text.length;
}

function renderedPageHasUsefulGain(beforeLen: number, afterLen: number): boolean {
  return (
    afterLen >= Math.max(SNAPSHOT_PW_VISIBLE_TEXT_MIN_CHARS, beforeLen * SNAPSHOT_PW_VISIBLE_TEXT_RATIO) ||
    (beforeLen < SNAPSHOT_PW_VISIBLE_SHORT_BEFORE_MAX &&
      afterLen > beforeLen + SNAPSHOT_PW_VISIBLE_SHORT_GAIN_MIN)
  );
}

export async function maybeUpgradeHomeWithPlaywright(
  homePage: FetchedPage,
  deadlineMs: number,
): Promise<{ page: FetchedPage; used: boolean }> {
  const remainingAfterHttpMs = deadlineMs - Date.now();
  const pwCapMs = SYSTEM_DEFAULTS.snapshotTieredFetch.playwrightBudgetMs;
  const pwBudgetMs = Math.min(
    pwCapMs,
    Math.max(0, remainingAfterHttpMs - SNAPSHOT_PLAYWRIGHT_REMAINING_RESERVE_MS),
  );

  if (pwBudgetMs < SNAPSHOT_PLAYWRIGHT_MIN_BUDGET_MS) {
    return { page: homePage, used: false };
  }

  try {
    const { fetchRenderedHomeHtml } = await import('../playwright-fetch.js');
    const rendered = await fetchRenderedHomeHtml(homePage.finalUrl, pwBudgetMs);
    if (!rendered?.html) {
      return { page: homePage, used: false };
    }

    const renderedHtml = truncateHtml(rendered.html);
    const beforeLen = visibleTextLength(homePage.html);
    const afterLen = visibleTextLength(renderedHtml);
    if (!renderedPageHasUsefulGain(beforeLen, afterLen)) {
      return { page: homePage, used: false };
    }

    const upgradedPage: FetchedPage = {
      ...homePage,
      html: renderedHtml,
      finalUrl: rendered.finalUrl || homePage.finalUrl,
    };
    logger.info('snapshot.playwright_home', {
      url: upgradedPage.finalUrl,
      beforeTextLen: beforeLen,
      afterTextLen: afterLen,
    });
    return { page: upgradedPage, used: true };
  } catch (error) {
    logger.warn('snapshot.playwright_failed', { error: (error as Error).message });
    return { page: homePage, used: false };
  }
}
