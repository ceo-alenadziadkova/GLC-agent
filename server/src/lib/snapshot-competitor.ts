/**
 * Lightweight, verifiable competitor comparison for free snapshot GET responses.
 * Never throws to callers — failures omit competitor_mini.
 */
import * as cheerio from 'cheerio';
import { SNAPSHOT_COMPETITOR_USER_AGENT } from '../config/bot-identity.js';
import { SNAPSHOT_COMPETITOR_BLOCKED_HOST_PATTERN } from '../config/snapshot-competitor-external-blocklist.js';
import { fetchPublicHttpUrl, PublicUrlNotAllowedError } from './public-http-url.js';
import type { CrawledPage, FreeSnapshotPreview, SnapshotCompetitorComparison } from '../types/audit.js';

/** AbortSignal.timeout() polyfill for Node < 18.17 */
function abortAfter(ms: number): AbortSignal {
  if (typeof AbortSignal.timeout === 'function') {
    return AbortSignal.timeout(ms);
  }
  const ctrl = new AbortController();
  const id = setTimeout(() => ctrl.abort(new DOMException('TimeoutError', 'TimeoutError')), ms);
  // Allow Node to exit even if the timer is still pending
  if (typeof (id as unknown as NodeJS.Timeout).unref === 'function') {
    (id as unknown as NodeJS.Timeout).unref();
  }
  return ctrl.signal;
}

export interface LightSiteMetrics {
  https: boolean;
  mobile_viewport: boolean;
  hreflang_count: number;
  structured_data: boolean;
}

function normHost(host: string): string {
  return host.replace(/^www\./i, '').toLowerCase();
}

/**
 * Pick one external URL from the client's homepage crawl (first page = primary entry).
 */
export function pickCompetitorCandidate(
  clientUrl: string,
  pagesCrawled: CrawledPage[] | null | undefined
): { url: string; name: string } | null {
  if (!pagesCrawled?.length) return null;
  let clientHost: string;
  try {
    clientHost = normHost(new URL(clientUrl).hostname);
  } catch {
    return null;
  }
  const home = pagesCrawled[0];
  const external = home?.links?.external ?? [];
  for (const link of external) {
    try {
      const u = new URL(link, clientUrl);
      const h = normHost(u.hostname);
      if (!h || h === clientHost) continue;
      if (SNAPSHOT_COMPETITOR_BLOCKED_HOST_PATTERN.test(u.hostname)) continue;
      const base = `${u.protocol}//${u.hostname}`;
      return { url: base, name: h };
    } catch {
      continue;
    }
  }
  return null;
}

export async function fetchLightSiteMetrics(
  url: string,
  timeoutMs: number
): Promise<LightSiteMetrics | null> {
  try {
    const signal = abortAfter(timeoutMs);
    const res = await fetchPublicHttpUrl(url, {
      signal,
      headers: {
        'User-Agent': SNAPSHOT_COMPETITOR_USER_AGENT,
        Accept: 'text/html,application/xhtml+xml',
      },
    });
    if (!res.ok) return null;
    const finalUrl = res.url || url;
    const html = await res.text();
    const $ = cheerio.load(html);
    return {
      https: finalUrl.startsWith('https:'),
      mobile_viewport: $('meta[name="viewport"]').length > 0,
      hreflang_count: $('link[rel="alternate"][hreflang]').length,
      structured_data: $('script[type="application/ld+json"]').length > 0,
    };
  } catch (e) {
    if (e instanceof PublicUrlNotAllowedError) return null;
    return null;
  }
}

function cmpBool(
  metric: string,
  label: string,
  clientVal: boolean,
  compVal: boolean
): SnapshotCompetitorComparison {
  let winner: SnapshotCompetitorComparison['winner'] = 'tie';
  if (clientVal && !compVal) winner = 'client';
  else if (!clientVal && compVal) winner = 'competitor';
  return { metric, client_val: clientVal, comp_val: compVal, winner, label };
}

function cmpNumber(
  metric: string,
  label: string,
  clientVal: number,
  compVal: number
): SnapshotCompetitorComparison {
  let winner: SnapshotCompetitorComparison['winner'] = 'tie';
  if (clientVal > compVal) winner = 'client';
  else if (compVal > clientVal) winner = 'competitor';
  return { metric, client_val: clientVal, comp_val: compVal, winner, label };
}

/**
 * Build competitor_mini only when at least one comparison is produced.
 */
export async function maybeBuildCompetitorMini(
  clientUrl: string,
  pagesCrawled: CrawledPage[] | null | undefined,
  timeoutMs: number
): Promise<FreeSnapshotPreview['competitor_mini'] | undefined> {
  const candidate = pickCompetitorCandidate(clientUrl, pagesCrawled);
  if (!candidate) return undefined;

  const settled = await Promise.allSettled([
    fetchLightSiteMetrics(clientUrl, timeoutMs),
    fetchLightSiteMetrics(candidate.url, timeoutMs),
  ]);
  if (settled[0].status !== 'fulfilled' || settled[1].status !== 'fulfilled') return undefined;
  const clientM = settled[0].value;
  const compM = settled[1].value;
  if (!clientM || !compM) return undefined;

  const comparisons: SnapshotCompetitorComparison[] = [
    cmpBool('https', 'HTTPS', clientM.https, compM.https),
    cmpBool('mobile_viewport', 'Mobile viewport meta', clientM.mobile_viewport, compM.mobile_viewport),
    cmpNumber('hreflang_count', 'hreflang locale signals', clientM.hreflang_count, compM.hreflang_count),
    cmpBool('structured_data', 'JSON-LD structured data', clientM.structured_data, compM.structured_data),
  ];

  return {
    competitor_name: candidate.name,
    competitor_url: candidate.url,
    comparisons,
    data_source: 'auto_detected',
    confidence: 'high',
  };
}

/**
 * Explicit comparison between two URLs (self vs competitor) for authenticated flows.
 */
export async function compareSiteMetricsByUrl(params: {
  selfUrl: string;
  competitorUrl: string;
  timeoutMs: number;
}): Promise<FreeSnapshotPreview['competitor_mini'] | undefined> {
  const { selfUrl, competitorUrl, timeoutMs } = params;
  let competitorHost = '';
  try {
    competitorHost = normHost(new URL(competitorUrl).hostname);
  } catch {
    return undefined;
  }

  const settled = await Promise.allSettled([
    fetchLightSiteMetrics(selfUrl, timeoutMs),
    fetchLightSiteMetrics(competitorUrl, timeoutMs),
  ]);
  if (settled[0].status !== 'fulfilled' || settled[1].status !== 'fulfilled') return undefined;
  const selfMetrics = settled[0].value;
  const competitorMetrics = settled[1].value;
  if (!selfMetrics || !competitorMetrics) return undefined;

  const comparisons: SnapshotCompetitorComparison[] = [
    cmpBool('https', 'HTTPS', selfMetrics.https, competitorMetrics.https),
    cmpBool('mobile_viewport', 'Mobile viewport meta', selfMetrics.mobile_viewport, competitorMetrics.mobile_viewport),
    cmpNumber('hreflang_count', 'hreflang locale signals', selfMetrics.hreflang_count, competitorMetrics.hreflang_count),
    cmpBool('structured_data', 'JSON-LD structured data', selfMetrics.structured_data, competitorMetrics.structured_data),
  ];

  return {
    competitor_name: competitorHost || competitorUrl,
    competitor_url: competitorUrl,
    comparisons,
    data_source: 'auto_detected',
    confidence: 'high',
  };
}
