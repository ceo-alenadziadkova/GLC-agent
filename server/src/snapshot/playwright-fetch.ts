/**
 * Tier-3 snapshot: render homepage in headless Chromium when static HTML looks like a client shell.
 * Requires `playwright` dependency and `npx playwright install chromium` on the host.
 */
import { chromium, type Browser } from 'playwright';

export type PlaywrightFetchResult = { html: string; finalUrl: string };

/**
 * Navigate and return serialized DOM after a short settle window for client hydration.
 */
export async function fetchRenderedHomeHtml(
  url: string,
  budgetMs: number,
): Promise<PlaywrightFetchResult | null> {
  const navTimeout = Math.min(Math.max(budgetMs - 2000, 4000), 25_000);
  const settleMs = Math.min(2000, Math.max(300, Math.floor(budgetMs / 6)));

  let browser: Browser | undefined;
  try {
    browser = await chromium.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
    });
    const context = await browser.newContext({
      userAgent:
        'Mozilla/5.0 (compatible; GLC-SnapshotScanner/1.0; +https://glctech.es) Chrome/120 Safari/537.36',
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
