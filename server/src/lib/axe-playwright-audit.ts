import AxeBuilder from '@axe-core/playwright';
import { chromium } from 'playwright';

import { PLAYWRIGHT_AUDITBOT_USER_AGENT } from '../config/bot-identity.js';
import { SNAPSHOT_AXE_NAV_TIMEOUT_MAX_MS, SNAPSHOT_AXE_NAV_TIMEOUT_MIN_MS } from '../config/snapshot-timing.js';
import { PublicUrlNotAllowedError, validatePublicAuditUrl } from './public-http-url.js';

export type AxePageResult = {
  url: string;
  violations: number;
  incomplete: number;
  critical_and_serious: number;
  rule_ids_sample: string[];
  error?: string;
};

const DEFAULT_TAGS = ['wcag2a', 'wcag2aa'] as const;

/**
 * Run axe-core on a small set of URLs via Playwright. Gate with AUDIT_AXE_PLAYWRIGHT / AUDIT_DEEP_SCAN.
 */
export async function runAxeOnPublicUrls(
  urls: string[],
  navigateTimeoutMs: number,
): Promise<AxePageResult[]> {
  const unique = [...new Set(urls)].slice(0, 5);
  const out: AxePageResult[] = [];

  let browser;
  try {
    browser = await chromium.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
    });
    const context = await browser.newContext({
      userAgent: PLAYWRIGHT_AUDITBOT_USER_AGENT,
      locale: 'en-US',
    });

    for (const raw of unique) {
      let validated: string;
      try {
        validated = await validatePublicAuditUrl(raw);
      } catch (e) {
        if (e instanceof PublicUrlNotAllowedError) {
          out.push({
            url: raw,
            violations: 0,
            incomplete: 0,
            critical_and_serious: 0,
            rule_ids_sample: [],
            error: 'URL not allowed for outbound requests',
          });
          continue;
        }
        out.push({
          url: raw,
          violations: 0,
          incomplete: 0,
          critical_and_serious: 0,
          rule_ids_sample: [],
          error: (e as Error).message,
        });
        continue;
      }

      const page = await context.newPage();
      try {
        await page.goto(validated, {
          waitUntil: 'domcontentloaded',
          timeout: Math.min(
            Math.max(navigateTimeoutMs, SNAPSHOT_AXE_NAV_TIMEOUT_MIN_MS),
            SNAPSHOT_AXE_NAV_TIMEOUT_MAX_MS,
          ),
        });
        const result = await new AxeBuilder({ page }).withTags([...DEFAULT_TAGS]).analyze();
        const critSerious = result.violations.filter(
          v => v.impact === 'critical' || v.impact === 'serious',
        ).length;
        const sample = result.violations.slice(0, 8).map(v => v.id);
        out.push({
          url: validated,
          violations: result.violations.length,
          incomplete: result.incomplete.length,
          critical_and_serious: critSerious,
          rule_ids_sample: sample,
        });
      } catch (e) {
        out.push({
          url: validated,
          violations: 0,
          incomplete: 0,
          critical_and_serious: 0,
          rule_ids_sample: [],
          error: (e as Error).message,
        });
      } finally {
        await page.close().catch(() => {});
      }
    }

    await context.close();
    await browser.close();
    browser = undefined;
  } catch (e) {
    if (browser) {
      await browser.close().catch(() => {});
    }
    out.push({
      url: unique[0] ?? '',
      violations: 0,
      incomplete: 0,
      critical_and_serious: 0,
      rule_ids_sample: [],
      error: (e as Error).message,
    });
  }

  return out;
}
