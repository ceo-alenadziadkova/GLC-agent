import { launch as launchChrome } from 'chrome-launcher';
import lighthouse from 'lighthouse';

import { validatePublicAuditUrl } from './public-http-url.js';

export type LighthouseAuditSummary = {
  requested_url: string;
  performance_score: number | null;
  accessibility_score: number | null;
  best_practices_score: number | null;
  seo_score: number | null;
  lcp: string | null;
  cls: string | null;
  fcp: string | null;
  error?: string;
};

function score01To100(v: number | undefined): number | null {
  if (v == null || !Number.isFinite(v)) return null;
  return Math.round(v * 100);
}

function auditDisplay(lhr: { audits?: Record<string, { displayValue?: string }> }, id: string): string | null {
  const v = lhr.audits?.[id]?.displayValue;
  return typeof v === 'string' && v.trim() ? v : null;
}

/**
 * Runs Lighthouse against a URL (headless Chrome via chrome-launcher). Heavy; gate with AUDIT_LIGHTHOUSE / AUDIT_DEEP_SCAN.
 */
export async function runLighthouseAuditSummary(
  url: string,
  budgetMs: number,
): Promise<LighthouseAuditSummary | null> {
  let chrome: Awaited<ReturnType<typeof launchChrome>> | undefined;
  try {
    const normalized = await validatePublicAuditUrl(url);
    const maxWait = Math.min(Math.max(budgetMs, 8000), 55_000);

    chrome = await launchChrome({
      chromeFlags: ['--headless', '--no-sandbox', '--disable-gpu', '--disable-dev-shm-usage'],
      logLevel: 'silent',
    });

    const runnerResult = await lighthouse(
      normalized,
      {
        logLevel: 'silent',
        port: chrome.port,
        output: 'json',
        onlyCategories: ['performance', 'accessibility', 'best-practices', 'seo'],
        maxWaitForLoad: maxWait,
      },
      undefined,
      undefined,
    );

    await Promise.resolve(chrome.kill());
    chrome = undefined;

    const lhr = runnerResult?.lhr;
    if (!lhr) {
      return {
        requested_url: normalized,
        performance_score: null,
        accessibility_score: null,
        best_practices_score: null,
        seo_score: null,
        lcp: null,
        cls: null,
        fcp: null,
        error: 'Lighthouse returned no report',
      };
    }

    const cats = lhr.categories;
    return {
      requested_url: normalized,
      performance_score: score01To100(cats?.performance?.score ?? undefined),
      accessibility_score: score01To100(cats?.accessibility?.score ?? undefined),
      best_practices_score: score01To100(cats?.['best-practices']?.score ?? undefined),
      seo_score: score01To100(cats?.seo?.score ?? undefined),
      lcp: auditDisplay(lhr, 'largest-contentful-paint'),
      cls: auditDisplay(lhr, 'cumulative-layout-shift'),
      fcp: auditDisplay(lhr, 'first-contentful-paint'),
    };
  } catch (e) {
    if (chrome) {
      try {
        await Promise.resolve(chrome.kill());
      } catch {
        /* ignore */
      }
    }
    return {
      requested_url: url,
      performance_score: null,
      accessibility_score: null,
      best_practices_score: null,
      seo_score: null,
      lcp: null,
      cls: null,
      fcp: null,
      error: (e as Error).message,
    };
  }
}
