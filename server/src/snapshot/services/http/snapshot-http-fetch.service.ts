import { fetchPublicHttpUrl, PublicUrlNotAllowedError } from '../../../lib/public-http-url.js';
import {
  SNAPSHOT_HEAD_PROBE_BROWSER_UA,
  SNAPSHOT_SCANNER_USER_AGENT,
} from '../../../config/bot-identity.js';
import { SYSTEM_DEFAULTS } from '../../../config/system-defaults.js';
import {
  SNAPSHOT_FETCH_MIN_REMAINING_MS,
  SNAPSHOT_FETCH_SINGLE_PAGE_BUDGET_CAP_MS,
  SNAPSHOT_HEAD_BUDGET_CAP_MS,
  SNAPSHOT_HEAD_MIN_REMAINING_MS,
  SNAPSHOT_MAX_HTML_BYTES,
} from '../../../config/snapshot-timing.js';
import {
  SNAPSHOT_FETCH_ACCEPT_LANGUAGE,
  SNAPSHOT_HEAD_ACCEPT_LANGUAGE,
} from '../../../config/snapshot-fetch-heuristics.js';
import { logger } from '../../../services/logger.js';
import { isLikelyHtmlDocument } from '../../html-detect.js';
import type { FetchedPage } from '../../types.js';
import type { HeadProbeResult, HomeFetchFailureReason } from '../../types/fetch-tiered.types.js';

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

export function truncateHtml(html: string): string {
  const bufferBytes = Buffer.byteLength(html, 'utf8');
  if (bufferBytes <= SNAPSHOT_MAX_HTML_BYTES) {
    return html;
  }
  return Buffer.from(html, 'utf8').subarray(0, SNAPSHOT_MAX_HTML_BYTES).toString('utf8');
}

export function resolveRemainingBudget(deadlineMs: number, capMs: number): number {
  const remainingMs = deadlineMs - Date.now();
  return Math.min(remainingMs, capMs);
}

export async function fetchHomePage(
  url: string,
  deadlineMs: number,
): Promise<
  | { ok: true; page: FetchedPage }
  | { ok: false; reason: HomeFetchFailureReason; httpStatus?: number }
> {
  const remainingMs = deadlineMs - Date.now();
  if (remainingMs < SNAPSHOT_FETCH_MIN_REMAINING_MS) {
    return { ok: false, reason: 'network_or_timeout' };
  }

  const budgetMs = resolveRemainingBudget(deadlineMs, SNAPSHOT_FETCH_SINGLE_PAGE_BUDGET_CAP_MS);
  try {
    const response = await fetchPublicHttpUrl(url, {
      signal: abortAfter(budgetMs),
      headers: {
        'User-Agent': SNAPSHOT_SCANNER_USER_AGENT,
        Accept: 'text/html,application/xhtml+xml',
        'Accept-Language': SNAPSHOT_FETCH_ACCEPT_LANGUAGE,
      },
    });

    const rawHtml = await response.text();
    if (!response.ok) {
      return { ok: false, reason: 'http_error', httpStatus: response.status };
    }
    if (!rawHtml.trim()) {
      return { ok: false, reason: 'empty_body', httpStatus: response.status };
    }

    const contentType = response.headers.get('content-type');
    if (!isLikelyHtmlDocument(contentType, rawHtml)) {
      logger.info('snapshot.home_non_html', {
        url: response.url || url,
        content_type: contentType ?? '',
      });
      return { ok: false, reason: 'non_html', httpStatus: response.status };
    }

    return {
      ok: true,
      page: {
        url,
        html: truncateHtml(rawHtml),
        status: response.status,
        finalUrl: response.url || url,
      },
    };
  } catch (error) {
    if (error instanceof PublicUrlNotAllowedError) {
      throw error;
    }
    logger.warn('snapshot.fetch_home_failed', { url, error: (error as Error).message });
    return { ok: false, reason: 'network_or_timeout' };
  }
}

export async function fetchExtraPage(url: string, deadlineMs: number): Promise<FetchedPage | null> {
  const remainingMs = deadlineMs - Date.now();
  if (remainingMs < SNAPSHOT_FETCH_MIN_REMAINING_MS) {
    return null;
  }

  const budgetMs = resolveRemainingBudget(deadlineMs, SNAPSHOT_FETCH_SINGLE_PAGE_BUDGET_CAP_MS);
  try {
    const response = await fetchPublicHttpUrl(url, {
      signal: abortAfter(budgetMs),
      headers: {
        'User-Agent': SNAPSHOT_SCANNER_USER_AGENT,
        Accept: 'text/html,application/xhtml+xml',
        'Accept-Language': SNAPSHOT_FETCH_ACCEPT_LANGUAGE,
      },
    });

    return {
      url,
      html: truncateHtml(await response.text()),
      status: response.status,
      finalUrl: response.url || url,
    };
  } catch (error) {
    if (error instanceof PublicUrlNotAllowedError) {
      throw error;
    }
    logger.warn('snapshot.fetch_one_failed', { url, error: (error as Error).message });
    return null;
  }
}

/**
 * HEAD on homepage when robots disallows GET — no response body; status + headers only.
 * Optional second attempt with a browser-like UA when config enables it.
 */
export async function fetchHeadHomeWhenRobotsBlock(
  url: string,
  deadlineMs: number,
): Promise<HeadProbeResult | undefined> {
  const remainingMs = deadlineMs - Date.now();
  if (remainingMs < SNAPSHOT_HEAD_MIN_REMAINING_MS) {
    return undefined;
  }
  const budgetMs = resolveRemainingBudget(deadlineMs, SNAPSHOT_HEAD_BUDGET_CAP_MS);

  const runHeadProbe = async (
    userAgent: string,
    uaUsed: HeadProbeResult['uaUsed'],
  ): Promise<HeadProbeResult | undefined> => {
    try {
      const response = await fetchPublicHttpUrl(
        url,
        {
          method: 'HEAD',
          signal: abortAfter(budgetMs),
          headers: {
            'User-Agent': userAgent,
            Accept: '*/*',
            'Accept-Language': SNAPSHOT_HEAD_ACCEPT_LANGUAGE,
          },
        },
        5,
      );

      const contentType = response.headers.get('content-type')?.trim();
      const xRobotsTag = response.headers.get('x-robots-tag')?.trim();
      return {
        status: response.status,
        ...(contentType ? { contentType } : {}),
        finalUrl: response.url || url,
        ...(xRobotsTag ? { xRobotsTag } : {}),
        uaUsed,
      };
    } catch (error) {
      if (error instanceof PublicUrlNotAllowedError) {
        throw error;
      }
      logger.warn('snapshot.robots_head_failed', { url, uaUsed, error: (error as Error).message });
      return undefined;
    }
  };

  let probe = await runHeadProbe(SNAPSHOT_SCANNER_USER_AGENT, 'glc_scanner');
  if (!probe && SYSTEM_DEFAULTS.snapshotTieredFetch.robotsHeadRetryBrowserUa) {
    logger.info('snapshot.robots_head_retry_browser_ua', { url });
    probe = await runHeadProbe(SNAPSHOT_HEAD_PROBE_BROWSER_UA, 'browser_compat');
  }
  return probe;
}
