/**
 * Tier-3 snapshot: render homepage in headless Chromium when static HTML looks like a client shell.
 * Requires `playwright` dependency; Chromium must be installed (Docker: `playwright install --with-deps chromium` in server/Dockerfile; local: `pnpm playwright:install` in `server/`).
 */
import { chromium, type Browser } from 'playwright';

import { PLAYWRIGHT_SNAPSHOT_USER_AGENT } from '../config/bot-identity.js';
import {
  SNAPSHOT_PW_BUDGET_SUBTRACT_MS,
  SNAPSHOT_PW_NAV_TIMEOUT_MAX_MS,
  SNAPSHOT_PW_NAV_TIMEOUT_MIN_MS,
  SNAPSHOT_PW_SETTLE_MAX_MS,
  SNAPSHOT_PW_SETTLE_MIN_MS,
} from '../config/snapshot-timing.js';

export type PlaywrightFetchResult = { html: string; finalUrl: string };

/**
 * Navigate and return serialized DOM after a short settle window for client hydration.
 */
export async function fetchRenderedHomeHtml(
  url: string,
  budgetMs: number,
): Promise<PlaywrightFetchResult | null> {
  const navTimeout = Math.min(
    Math.max(budgetMs - SNAPSHOT_PW_BUDGET_SUBTRACT_MS, SNAPSHOT_PW_NAV_TIMEOUT_MIN_MS),
    SNAPSHOT_PW_NAV_TIMEOUT_MAX_MS,
  );
  const settleMs = Math.min(
    SNAPSHOT_PW_SETTLE_MAX_MS,
    Math.max(SNAPSHOT_PW_SETTLE_MIN_MS, Math.floor(budgetMs / 6)),
  );

  let browser: Browser | undefined;
  try {
    browser = await chromium.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
    });
    const context = await browser.newContext({
      userAgent: PLAYWRIGHT_SNAPSHOT_USER_AGENT,
      locale: 'en-US',
    });
    const page = await context.newPage();
    await page.goto(url, {
      waitUntil: 'domcontentloaded',
      timeout: navTimeout,
    });
    await new Promise<void>(resolve => {
      setTimeout(resolve, settleMs);
    });
    const finalUrl = page.url();
    const html = await page.content();
    await context.close();
    await browser.close();
    browser = undefined;
    return { html, finalUrl };
  } catch {
    if (browser) {
      await browser.close().catch(() => {});
    }
    return null;
  }
}
