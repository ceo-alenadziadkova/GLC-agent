import {
  SNAPSHOT_CRAWL_DELAY_ROOM_SUBTRACT_MS,
  SNAPSHOT_ROBOTS_ABORT_MAX_MS,
  SNAPSHOT_ROBOTS_ABORT_MIN_MS,
} from '../../config/snapshot-timing.js';
import { SNAPSHOT_ROBOTS_FALLBACK_HTML_PATHS } from '../../config/snapshot-fetch-heuristics.js';
import { logger } from '../../services/logger.js';
import {
  classifyRobotsFallbackSiteClass,
  getSnapshotRobotsPolicy,
  robotsSnapshotUrlAllowed,
  type SnapshotRobotsPolicy,
} from '../robots-guard.js';
import { isLikelyHtmlDocument } from '../html-detect.js';
import type { FetchedPage, SnapshotScanCoverage } from '../types.js';
import { SNAPSHOT_ROBOTS_FALLBACK_MAX_HTML_PAGES } from '../config/fetch-tiered-policy.js';
import { fetchExtraPage, fetchHeadHomeWhenRobotsBlock } from './http/snapshot-http-fetch.service.js';

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

async function waitForCrawlDelay(
  robotsPolicy: SnapshotRobotsPolicy,
  deadlineMs: number,
): Promise<number> {
  if (robotsPolicy.crawlDelayMs <= 0) {
    return 0;
  }
  const roomMs = deadlineMs - Date.now() - SNAPSHOT_CRAWL_DELAY_ROOM_SUBTRACT_MS;
  const waitMs = Math.min(robotsPolicy.crawlDelayMs, Math.max(0, roomMs));
  if (waitMs <= 0) {
    return 0;
  }
  await new Promise<void>(resolve => {
    setTimeout(resolve, waitMs);
  });
  return waitMs;
}

export async function loadSnapshotRobotsPolicy(origin: string, deadlineMs: number): Promise<SnapshotRobotsPolicy> {
  return getSnapshotRobotsPolicy(
    origin,
    abortAfter(
      Math.min(SNAPSHOT_ROBOTS_ABORT_MAX_MS, Math.max(SNAPSHOT_ROBOTS_ABORT_MIN_MS, deadlineMs - Date.now())),
    ),
  );
}

export async function runRobotsFallbackFetch(
  baseHref: string,
  deadlineMs: number,
  origin: string,
  robotsPolicy: SnapshotRobotsPolicy,
): Promise<{
  pages: FetchedPage[];
  robotsFallbackSiteClass: SnapshotScanCoverage['robotsFallbackSiteClass'];
  robotsHeadProbe: Awaited<ReturnType<typeof fetchHeadHomeWhenRobotsBlock>>;
  robotsExtrasSkipped: number;
  crawlDelayMsApplied: number;
}> {
  logger.info('snapshot.robots_home_blocked', { origin });
  const host = new URL(baseHref).hostname;
  const robotsFallbackSiteClass = classifyRobotsFallbackSiteClass(host);
  const robotsHeadProbe = await fetchHeadHomeWhenRobotsBlock(baseHref, deadlineMs);

  const pages: FetchedPage[] = [];
  let robotsExtrasSkipped = 0;
  let crawlDelayMsApplied = 0;
  const triedPath = new Set<string>();

  for (const path of SNAPSHOT_ROBOTS_FALLBACK_HTML_PATHS) {
    if (pages.length >= SNAPSHOT_ROBOTS_FALLBACK_MAX_HTML_PAGES) {
      break;
    }
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
    if (triedPath.has(pathKey)) {
      continue;
    }
    triedPath.add(pathKey);

    if (!robotsSnapshotUrlAllowed(fullUrl, robotsPolicy)) {
      robotsExtrasSkipped += 1;
      continue;
    }

    if (pages.length >= 1) {
      crawlDelayMsApplied += await waitForCrawlDelay(robotsPolicy, deadlineMs);
    }

    const extraPage = await fetchExtraPage(fullUrl, deadlineMs);
    if (!extraPage || !isLikelyHtmlDocument(null, extraPage.html)) {
      continue;
    }
    pages.push(extraPage);
  }

  return {
    pages,
    robotsFallbackSiteClass,
    robotsHeadProbe,
    robotsExtrasSkipped,
    crawlDelayMsApplied,
  };
}
