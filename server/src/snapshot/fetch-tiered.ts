/**
 * Tiered fetch for free snapshot: 1 homepage + up to 3 same-origin URLs within time/HTML limits.
 */
import * as cheerio from 'cheerio';
import { fetchPublicHttpUrl, PublicUrlNotAllowedError, validatePublicAuditUrl } from '../lib/public-http-url.js';
import { logger } from '../services/logger.js';
import { htmlLooksLikeClientShell } from './extract-facts.js';
import type { FetchedPage, SnapshotPageRole, SnapshotScanCoverage } from './types.js';

type RobotsHeadProbeShape = NonNullable<SnapshotScanCoverage['robotsHeadProbe']>;
import {
  classifyRobotsFallbackSiteClass,
  getSnapshotRobotsPolicy,
  robotsSnapshotHomeAllowed,
  robotsSnapshotUrlAllowed,
} from './robots-guard.js';
import { isLikelyHtmlDocument } from './html-detect.js';
import { detectPageAnomalies } from './page-anomaly.js';
import {
  SNAPSHOT_HEAD_PROBE_BROWSER_UA,
  SNAPSHOT_SCANNER_USER_AGENT,
} from '../config/bot-identity.js';
import { getSnapshotFetchBudgetMs } from '../config/snapshot-fetch-budget.js';
import {
  SNAPSHOT_CRAWL_DELAY_ROOM_SUBTRACT_MS,
  SNAPSHOT_FETCH_MIN_REMAINING_MS,
  SNAPSHOT_FETCH_SINGLE_PAGE_BUDGET_CAP_MS,
  SNAPSHOT_HEAD_BUDGET_CAP_MS,
  SNAPSHOT_HEAD_MIN_REMAINING_MS,
  SNAPSHOT_MAX_DISCOVERY_LINKS,
  SNAPSHOT_MAX_EXTRA_PAGES,
  SNAPSHOT_MAX_HTML_BYTES,
  SNAPSHOT_PLAYWRIGHT_MIN_BUDGET_MS,
  SNAPSHOT_PLAYWRIGHT_REMAINING_RESERVE_MS,
  SNAPSHOT_PW_VISIBLE_SHORT_BEFORE_MAX,
  SNAPSHOT_PW_VISIBLE_SHORT_GAIN_MIN,
  SNAPSHOT_PW_VISIBLE_TEXT_MIN_CHARS,
  SNAPSHOT_PW_VISIBLE_TEXT_RATIO,
  SNAPSHOT_ROBOTS_ABORT_MAX_MS,
  SNAPSHOT_ROBOTS_ABORT_MIN_MS,
} from '../config/snapshot-timing.js';
import {
  SNAPSHOT_FETCH_ACCEPT_LANGUAGE,
  SNAPSHOT_HEAD_ACCEPT_LANGUAGE,
  SNAPSHOT_PATH_HINT_REGEXES,
  SNAPSHOT_ROBOTS_FALLBACK_HTML_PATHS,
} from '../config/snapshot-fetch-heuristics.js';

/** When the homepage is robots-blocked, try up to this many allowed same-origin HTML paths (no homepage GET). */
const MAX_ROBOTS_FALLBACK_HTML_PAGES = SNAPSHOT_MAX_EXTRA_PAGES + 1;

function abortAfter(ms: number): AbortSignal {
  if (typeof AbortSignal.timeout === 'function') {
    return AbortSignal.timeout(ms);
  }
  const ctrl = new AbortController();
  const id = setTimeout(() => ctrl.abort(new DOMException('TimeoutError', 'TimeoutError')), ms);
  if (typeof (id as unknown as NodeJS.Timeout).unref === 'function') {
    (id as unknown as NodeJS.Timeout).unref();
  }
  return ctrl.signal;
}

function truncateHtml(html: string): string {
  const buf = Buffer.byteLength(html, 'utf8');
  if (buf <= SNAPSHOT_MAX_HTML_BYTES) return html;
  return Buffer.from(html, 'utf8').subarray(0, SNAPSHOT_MAX_HTML_BYTES).toString('utf8');
}

function visibleTextLength(html: string): number {
  const $ = cheerio.load(html);
  const t = ($('main').text() || $('article').text() || $('body').text()).replace(/\s+/g, ' ').trim();
  return t.length;
}

export type HomeFetchFailureReason =
  | 'network_or_timeout'
  | 'http_error'
  | 'non_html'
  | 'empty_body';

/**
 * Homepage fetch with HTML validation (extras still use {@link fetchOne}).
 */
async function fetchHomePage(
  url: string,
  deadlineMs: number,
): Promise<
  | { ok: true; page: FetchedPage }
  | { ok: false; reason: HomeFetchFailureReason; httpStatus?: number }
> {
  const remaining = deadlineMs - Date.now();
  if (remaining < SNAPSHOT_FETCH_MIN_REMAINING_MS) {
    return { ok: false, reason: 'network_or_timeout' };
  }
  const budget = Math.min(remaining, SNAPSHOT_FETCH_SINGLE_PAGE_BUDGET_CAP_MS);
  try {
    const res = await fetchPublicHttpUrl(url, {
      signal: abortAfter(budget),
      headers: {
        'User-Agent': SNAPSHOT_SCANNER_USER_AGENT,
        Accept: 'text/html,application/xhtml+xml',
        'Accept-Language': SNAPSHOT_FETCH_ACCEPT_LANGUAGE,
      },
    });
    const raw = await res.text();
    if (!res.ok) {
      return { ok: false, reason: 'http_error', httpStatus: res.status };
    }
    if (!raw.trim()) {
      return { ok: false, reason: 'empty_body', httpStatus: res.status };
    }
    const ct = res.headers.get('content-type');
    if (!isLikelyHtmlDocument(ct, raw)) {
      logger.info('snapshot.home_non_html', {
        url: res.url || url,
        content_type: ct ?? '',
      });
      return { ok: false, reason: 'non_html', httpStatus: res.status };
    }
    const html = truncateHtml(raw);
    return {
      ok: true,
      page: {
        url,
        html,
        status: res.status,
        finalUrl: res.url || url,
      },
    };
  } catch (e) {
    if (e instanceof PublicUrlNotAllowedError) throw e;
    logger.warn('snapshot.fetch_home_failed', { url, error: (e as Error).message });
    return { ok: false, reason: 'network_or_timeout' };
  }
}

async function fetchOne(
  url: string,
  deadlineMs: number,
): Promise<FetchedPage | null> {
  const remaining = deadlineMs - Date.now();
  if (remaining < SNAPSHOT_FETCH_MIN_REMAINING_MS) return null;
  const budget = Math.min(remaining, SNAPSHOT_FETCH_SINGLE_PAGE_BUDGET_CAP_MS);
  try {
    const res = await fetchPublicHttpUrl(url, {
      signal: abortAfter(budget),
      headers: {
        'User-Agent': SNAPSHOT_SCANNER_USER_AGENT,
        Accept: 'text/html,application/xhtml+xml',
        'Accept-Language': SNAPSHOT_FETCH_ACCEPT_LANGUAGE,
      },
    });
    const raw = await res.text();
    const html = truncateHtml(raw);
    return {
      url,
      html,
      status: res.status,
      finalUrl: res.url || url,
    };
  } catch (e) {
    if (e instanceof PublicUrlNotAllowedError) throw e;
    logger.warn('snapshot.fetch_one_failed', { url, error: (e as Error).message });
    return null;
  }
}

type HeadProbeResult = {
  status: number;
  contentType?: string;
  finalUrl?: string;
  xRobotsTag?: string;
  uaUsed: 'glc_scanner' | 'browser_compat';
};

/**
 * HEAD on homepage when robots disallows GET — no response body; status + headers only.
 * Optional second attempt with a browser-like UA when `SNAPSHOT_ROBOTS_HEAD_BROWSER_UA=1` (logged).
 */
async function fetchHeadHomeWhenRobotsBlock(
  url: string,
  deadlineMs: number,
): Promise<HeadProbeResult | undefined> {
  const remaining = deadlineMs - Date.now();
  if (remaining < SNAPSHOT_HEAD_MIN_REMAINING_MS) return undefined;
  const budget = Math.min(remaining, SNAPSHOT_HEAD_BUDGET_CAP_MS);

  const runHead = async (ua: string, uaUsed: HeadProbeResult['uaUsed']): Promise<HeadProbeResult | undefined> => {
    try {
      const res = await fetchPublicHttpUrl(
        url,
        {
          method: 'HEAD',
          signal: abortAfter(budget),
          headers: {
            'User-Agent': ua,
            Accept: '*/*',
            'Accept-Language': SNAPSHOT_HEAD_ACCEPT_LANGUAGE,
          },
        },
        5,
      );
      const ct = res.headers.get('content-type')?.trim();
      const xrt = res.headers.get('x-robots-tag')?.trim();
      return {
        status: res.status,
        ...(ct ? { contentType: ct } : {}),
        finalUrl: res.url || url,
        ...(xrt ? { xRobotsTag: xrt } : {}),
        uaUsed,
      };
    } catch (e) {
      if (e instanceof PublicUrlNotAllowedError) throw e;
      logger.warn('snapshot.robots_head_failed', { url, uaUsed, error: (e as Error).message });
      return undefined;
    }
  };

  let probe = await runHead(SNAPSHOT_SCANNER_USER_AGENT, 'glc_scanner');
  const allowAltUa = process.env.SNAPSHOT_ROBOTS_HEAD_BROWSER_UA === '1';
  if (!probe && allowAltUa) {
    logger.info('snapshot.robots_head_retry_browser_ua', { url });
    probe = await runHead(SNAPSHOT_HEAD_PROBE_BROWSER_UA, 'browser_compat');
  }
  return probe;
}

/**
 * Collect internal URLs from nav, footer, and early links (capped).
 */
function discoverCandidateUrls(homeHtml: string, baseUrl: string): string[] {
  const $ = cheerio.load(homeHtml);
  const base = new URL(baseUrl);
  const seen = new Set<string>();
  const out: string[] = [];

  const consider = (href: string | undefined) => {
    if (!href || href.startsWith('#') || href.startsWith('javascript:')) return;
    try {
      const u = new URL(href, baseUrl);
      if (u.hostname !== base.hostname) return;
      if (!['http:', 'https:'].includes(u.protocol)) return;
      const norm = `${u.origin}${u.pathname.replace(/\/$/, '') || '/'}`;
      if (seen.has(norm)) return;
      seen.add(norm);
      out.push(u.href);
    } catch {
      /* skip */
    }
  };

  $('header a[href], nav a[href], footer a[href], [role="navigation"] a[href]').each((_, el) => {
    consider($(el).attr('href'));
  });
  $('a[href]').each((_, el) => {
    if (out.length >= SNAPSHOT_MAX_DISCOVERY_LINKS) return false;
    consider($(el).attr('href'));
    return undefined;
  });

  return out;
}

export function inferSnapshotPageRole(pathname: string): SnapshotPageRole {
  const p = pathname.toLowerCase();
  if (p === '/' || p === '') return 'home';
  if (/\/contact\b/i.test(p)) return 'contact';
  if (/\/pricing|\/plans|\/subscribe|\/billing\b/i.test(p)) return 'pricing';
  if (/\/about|\/team|\/company\b/i.test(p)) return 'about';
  if (/\/services?\b/i.test(p)) return 'services';
  return 'other';
}

function scorePath(urlStr: string): number {
  let s = 0;
  try {
    const p = new URL(urlStr).pathname.toLowerCase();
    for (const re of SNAPSHOT_PATH_HINT_REGEXES) {
      if (re.test(p)) s += 3;
    }
    if (p.split('/').filter(Boolean).length <= 2) s += 1;
  } catch {
    return 0;
  }
  return s;
}

/**
 * Homepage first, then up to 3 additional URLs prioritized by path hints, within total wall time.
 */
function buildCoverage(
  totalBudgetMs: number,
  startedAt: number,
  pages: FetchedPage[],
  opts?: {
    playwrightEligible?: boolean;
    playwrightUsed?: boolean;
    robotsTxtFetched?: boolean;
    robotsHomeDisallowed?: boolean;
    robotsHeadProbe?: RobotsHeadProbeShape;
    robotsFallbackSiteClass?: SnapshotScanCoverage['robotsFallbackSiteClass'];
    robotsExtrasSkipped?: number;
    crawlDelayMsApplied?: number;
    homeFetchFailure?: HomeFetchFailureReason;
    challengeLikely?: boolean;
    challengeTaxonomy?: string;
    parkedLikely?: boolean;
    parkedTaxonomy?: string;
    loginWallLikely?: boolean;
    loginWallTaxonomy?: string;
  },
): SnapshotScanCoverage {
  const elapsedMs = Math.max(0, Date.now() - startedAt);
  return {
    budgetMs: totalBudgetMs,
    elapsedMs,
    pagesFetched: pages.length,
    maxPagesPlanned: 1 + SNAPSHOT_MAX_EXTRA_PAGES,
    pages: pages.map(p => {
      let pathname = '/';
      try {
        pathname = new URL(p.finalUrl).pathname;
      } catch {
        /* keep default */
      }
      return {
        finalUrl: p.finalUrl,
        status: p.status,
        role: inferSnapshotPageRole(pathname),
      };
    }),
    ...(opts?.playwrightEligible !== undefined ? { playwrightEligible: opts.playwrightEligible } : {}),
    ...(opts?.playwrightUsed !== undefined ? { playwrightUsed: opts.playwrightUsed } : {}),
    ...(opts?.robotsTxtFetched !== undefined ? { robotsTxtFetched: opts.robotsTxtFetched } : {}),
    ...(opts?.robotsHomeDisallowed !== undefined ? { robotsHomeDisallowed: opts.robotsHomeDisallowed } : {}),
    ...(opts?.robotsHeadProbe ? { robotsHeadProbe: opts.robotsHeadProbe } : {}),
    ...(opts?.robotsFallbackSiteClass ? { robotsFallbackSiteClass: opts.robotsFallbackSiteClass } : {}),
    ...(opts?.robotsExtrasSkipped !== undefined ? { robotsExtrasSkipped: opts.robotsExtrasSkipped } : {}),
    ...(opts?.crawlDelayMsApplied !== undefined ? { crawlDelayMsApplied: opts.crawlDelayMsApplied } : {}),
    ...(opts?.homeFetchFailure !== undefined ? { homeFetchFailure: opts.homeFetchFailure } : {}),
    ...(opts?.challengeLikely === true ? { challengeLikely: true } : {}),
    ...(opts?.challengeTaxonomy ? { challengeTaxonomy: opts.challengeTaxonomy } : {}),
    ...(opts?.parkedLikely === true ? { parkedLikely: true } : {}),
    ...(opts?.parkedTaxonomy ? { parkedTaxonomy: opts.parkedTaxonomy } : {}),
    ...(opts?.loginWallLikely === true ? { loginWallLikely: true } : {}),
    ...(opts?.loginWallTaxonomy ? { loginWallTaxonomy: opts.loginWallTaxonomy } : {}),
  };
}

export async function fetchTieredPages(companyUrl: string): Promise<{
  pages: FetchedPage[];
  baseHref: string;
  coverage: SnapshotScanCoverage;
}> {
  const baseHref = await validatePublicAuditUrl(companyUrl);
  const totalBudgetMs = getSnapshotFetchBudgetMs();
  const startedAt = Date.now();
  const deadline = startedAt + totalBudgetMs;

  const origin = new URL(baseHref).origin;
  const robotsPolicy = await getSnapshotRobotsPolicy(
    origin,
    abortAfter(
      Math.min(SNAPSHOT_ROBOTS_ABORT_MAX_MS, Math.max(SNAPSHOT_ROBOTS_ABORT_MIN_MS, deadline - Date.now())),
    ),
  );

  if (!robotsSnapshotHomeAllowed(robotsPolicy, origin)) {
    logger.info('snapshot.robots_home_blocked', { origin });
    const host = new URL(baseHref).hostname;
    const robotsFallbackSiteClass = classifyRobotsFallbackSiteClass(host);
    const robotsHeadProbe = await fetchHeadHomeWhenRobotsBlock(baseHref, deadline);

    const pages: FetchedPage[] = [];
    let robotsExtrasSkipped = 0;
    let crawlDelayMsApplied = 0;
    const triedPath = new Set<string>();

    for (const path of SNAPSHOT_ROBOTS_FALLBACK_HTML_PATHS) {
      if (pages.length >= MAX_ROBOTS_FALLBACK_HTML_PAGES) break;
      let fullUrl: string;
      try {
        fullUrl = new URL(path, `${origin}/`).href;
      } catch {
        continue;
      }
      let pathname = '/';
      try {
        pathname = new URL(fullUrl).pathname || '/';
      } catch {
        continue;
      }
      const pathKey = pathname.replace(/\/$/, '') || '/';
      if (triedPath.has(pathKey)) continue;
      triedPath.add(pathKey);

      if (!robotsSnapshotUrlAllowed(fullUrl, robotsPolicy)) {
        robotsExtrasSkipped += 1;
        continue;
      }

      if (robotsPolicy.crawlDelayMs > 0 && pages.length >= 1) {
        const room = deadline - Date.now() - SNAPSHOT_CRAWL_DELAY_ROOM_SUBTRACT_MS;
        const wait = Math.min(robotsPolicy.crawlDelayMs, Math.max(0, room));
        if (wait > 0) {
          await new Promise<void>(resolve => {
            setTimeout(resolve, wait);
          });
          crawlDelayMsApplied += wait;
        }
      }

      const extra = await fetchOne(fullUrl, deadline);
      if (!extra || !isLikelyHtmlDocument(null, extra.html)) continue;
      pages.push(extra);
    }

    return {
      pages,
      baseHref,
      coverage: buildCoverage(totalBudgetMs, startedAt, pages, {
        robotsTxtFetched: robotsPolicy.hadFile,
        robotsHomeDisallowed: true,
        ...(robotsHeadProbe ? { robotsHeadProbe } : {}),
        robotsFallbackSiteClass,
        robotsExtrasSkipped: robotsExtrasSkipped > 0 ? robotsExtrasSkipped : undefined,
        crawlDelayMsApplied: crawlDelayMsApplied > 0 ? crawlDelayMsApplied : undefined,
      }),
    };
  }

  const homeResult = await fetchHomePage(baseHref, deadline);
  if (!homeResult.ok) {
    return {
      pages: [],
      baseHref,
      coverage: buildCoverage(totalBudgetMs, startedAt, [], {
        robotsTxtFetched: robotsPolicy.hadFile,
        homeFetchFailure: homeResult.reason,
      }),
    };
  }

  const home = homeResult.page;

  const playwrightEligible = htmlLooksLikeClientShell(home.html);
  let playwrightUsed = false;
  let homePage: FetchedPage = home;

  const playwrightDisabled =
    process.env.SNAPSHOT_PLAYWRIGHT === '0' || process.env.SNAPSHOT_PLAYWRIGHT === 'false';
  if (!playwrightDisabled && playwrightEligible) {
    const remainingAfterHttp = deadline - Date.now();
    const pwCap = Number(process.env.SNAPSHOT_PLAYWRIGHT_BUDGET_MS ?? 14_000);
    const pwBudget = Math.min(pwCap, Math.max(0, remainingAfterHttp - SNAPSHOT_PLAYWRIGHT_REMAINING_RESERVE_MS));
    if (pwBudget >= SNAPSHOT_PLAYWRIGHT_MIN_BUDGET_MS) {
      try {
        const { fetchRenderedHomeHtml } = await import('./playwright-fetch.js');
        const rendered = await fetchRenderedHomeHtml(homePage.finalUrl, pwBudget);
        if (rendered?.html) {
          const truncated = truncateHtml(rendered.html);
          const beforeLen = visibleTextLength(homePage.html);
          const afterLen = visibleTextLength(truncated);
          if (
            afterLen >= Math.max(SNAPSHOT_PW_VISIBLE_TEXT_MIN_CHARS, beforeLen * SNAPSHOT_PW_VISIBLE_TEXT_RATIO) ||
            (beforeLen < SNAPSHOT_PW_VISIBLE_SHORT_BEFORE_MAX &&
              afterLen > beforeLen + SNAPSHOT_PW_VISIBLE_SHORT_GAIN_MIN)
          ) {
            homePage = {
              ...homePage,
              html: truncated,
              finalUrl: rendered.finalUrl || homePage.finalUrl,
            };
            playwrightUsed = true;
            logger.info('snapshot.playwright_home', {
              url: homePage.finalUrl,
              beforeTextLen: beforeLen,
              afterTextLen: afterLen,
            });
          }
        }
      } catch (e) {
        logger.warn('snapshot.playwright_failed', { error: (e as Error).message });
      }
    }
  }

  const pages: FetchedPage[] = [homePage];

  const candidates = discoverCandidateUrls(homePage.html, homePage.finalUrl)
    .filter(u => {
      try {
        return new URL(u).href !== new URL(homePage.finalUrl).href;
      } catch {
        return false;
      }
    })
    .sort((a, b) => scorePath(b) - scorePath(a));

  const picked = new Set<string>([new URL(homePage.finalUrl).href]);
  let robotsExtrasSkipped = 0;
  let crawlDelayMsApplied = 0;
  for (const u of candidates) {
    if (pages.length >= 1 + SNAPSHOT_MAX_EXTRA_PAGES) break;
    let norm: string;
    try {
      norm = new URL(u).href;
    } catch {
      continue;
    }
    if (picked.has(norm)) continue;
    if (!robotsSnapshotUrlAllowed(u, robotsPolicy)) {
      robotsExtrasSkipped += 1;
      continue;
    }
    picked.add(norm);
    if (robotsPolicy.crawlDelayMs > 0 && pages.length >= 1) {
      const room = deadline - Date.now() - SNAPSHOT_CRAWL_DELAY_ROOM_SUBTRACT_MS;
      const wait = Math.min(robotsPolicy.crawlDelayMs, Math.max(0, room));
      if (wait > 0) {
        await new Promise<void>(resolve => {
          setTimeout(resolve, wait);
        });
        crawlDelayMsApplied += wait;
      }
    }
    const extra = await fetchOne(u, deadline);
    if (extra) pages.push(extra);
  }

  const pageAnomaly = detectPageAnomalies(homePage.html, homePage.finalUrl);

  return {
    pages,
    baseHref,
    coverage: buildCoverage(totalBudgetMs, startedAt, pages, {
      playwrightEligible,
      playwrightUsed,
      robotsTxtFetched: robotsPolicy.hadFile,
      robotsExtrasSkipped: robotsExtrasSkipped > 0 ? robotsExtrasSkipped : undefined,
      crawlDelayMsApplied: crawlDelayMsApplied > 0 ? crawlDelayMsApplied : undefined,
      ...pageAnomaly,
    }),
  };
}
