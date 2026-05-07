import { PLAYWRIGHT_AUDITBOT_USER_AGENT } from '../config/bot-identity.js';
import { COLLECTOR_FETCH_TIMEOUT_MS } from '../config/collector-http.js';
import { auditDeepScanEnabled } from './audit-deep-scan-env.js';
import { validatePublicAuditUrl } from './public-http-url.js';

export interface DomUxSignalSnapshot {
  collected: boolean;
  viewport_meta_present: boolean;
  cta_count: number;
  form_count: number;
}

export async function collectDomUxSignals(url: string): Promise<DomUxSignalSnapshot | null> {
  if (!auditDeepScanEnabled()) {
    return null;
  }

  let validated = '';
  try {
    validated = await validatePublicAuditUrl(url);
  } catch {
    return null;
  }

  let browser;
  try {
    const { chromium } = await import('playwright');
    browser = await chromium.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
    });
    const context = await browser.newContext({
      userAgent: PLAYWRIGHT_AUDITBOT_USER_AGENT,
      locale: 'es-ES',
    });
    const page = await context.newPage();
    await page.goto(validated, { waitUntil: 'domcontentloaded', timeout: COLLECTOR_FETCH_TIMEOUT_MS });
    await page.waitForTimeout(1200);

    const snapshot = await page.evaluate(() => {
      const ctaPattern = /(saber m[aá]s|contacta|solicita|pide presupuesto|get started|learn more|contact|book|reserve|sign up)/i;
      const ctaCandidates = Array.from(document.querySelectorAll('a,button,[role="button"]'));
      const ctaCount = ctaCandidates.filter((el) => ctaPattern.test((el.textContent ?? '').trim())).length;
      const formCount = document.querySelectorAll('form').length;
      const viewportMetaPresent = Boolean(document.querySelector('meta[name="viewport"]'));
      return {
        collected: true,
        viewport_meta_present: viewportMetaPresent,
        cta_count: ctaCount,
        form_count: formCount,
      };
    });

    await page.close();
    await context.close();
    await browser.close();
    return snapshot;
  } catch {
    if (browser) {
      await browser.close().catch(() => {});
    }
    return null;
  }
}
