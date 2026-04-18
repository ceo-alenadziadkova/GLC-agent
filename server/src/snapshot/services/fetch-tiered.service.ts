import { validatePublicAuditUrl } from '../../lib/public-http-url.js';
import { getSnapshotFetchBudgetMs } from '../../config/snapshot-fetch-budget.js';
import {
  SNAPSHOT_CRAWL_DELAY_ROOM_SUBTRACT_MS,
  SNAPSHOT_MAX_EXTRA_PAGES,
} from '../../config/snapshot-timing.js';
import { htmlLooksLikeClientShell } from '../extract-facts.js';
import { detectPageAnomalies } from '../page-anomaly.js';
import { robotsSnapshotHomeAllowed, robotsSnapshotUrlAllowed } from '../robots-guard.js';
import type { FetchedPage, SnapshotScanCoverage } from '../types.js';
import { discoverCandidateUrls } from '../domain/url-discovery.js';
import { scorePath } from '../domain/path-priority.js';
import { buildSnapshotFetchCoverage } from '../mappers/snapshot-fetch-coverage.mapper.js';
import { fetchExtraPage, fetchHomePage } from './http/snapshot-http-fetch.service.js';
import {
  loadSnapshotRobotsPolicy,
  runRobotsFallbackFetch,
} from './fetch-tiered-robots-fallback.service.js';
import { maybeUpgradeHomeWithPlaywright } from './fetch-tiered-playwright.service.js';
import { SYSTEM_DEFAULTS } from '../../config/system-defaults.js';

async function appendExtraPages(
  homePage: FetchedPage,
  robotsPolicy: Awaited<ReturnType<typeof loadSnapshotRobotsPolicy>>,
  deadlineMs: number,
): Promise<{ pages: FetchedPage[]; robotsExtrasSkipped: number; crawlDelayMsApplied: number }> {
  const pages: FetchedPage[] = [homePage];
  const candidates = discoverCandidateUrls(homePage.html, homePage.finalUrl)
    .filter(candidate => {
      try {
        return new URL(candidate).href !== new URL(homePage.finalUrl).href;
      } catch {
        return false;
      }
    })
    .sort((left, right) => scorePath(right) - scorePath(left));

  const picked = new Set<string>([new URL(homePage.finalUrl).href]);
  let robotsExtrasSkipped = 0;
  let crawlDelayMsApplied = 0;

  for (const candidateUrl of candidates) {
    if (pages.length >= 1 + SNAPSHOT_MAX_EXTRA_PAGES) {
      break;
    }
    let normalized: string;
    try {
      normalized = new URL(candidateUrl).href;
    } catch {
      continue;
    }
    if (picked.has(normalized)) {
      continue;
    }
    if (!robotsSnapshotUrlAllowed(candidateUrl, robotsPolicy)) {
      robotsExtrasSkipped += 1;
      continue;
    }
    picked.add(normalized);

    if (robotsPolicy.crawlDelayMs > 0 && pages.length >= 1) {
      const roomMs = deadlineMs - Date.now() - SNAPSHOT_CRAWL_DELAY_ROOM_SUBTRACT_MS;
      const waitMs = Math.min(robotsPolicy.crawlDelayMs, Math.max(0, roomMs));
      if (waitMs > 0) {
        await new Promise<void>(resolve => {
          setTimeout(resolve, waitMs);
        });
        crawlDelayMsApplied += waitMs;
      }
    }

    const extraPage = await fetchExtraPage(candidateUrl, deadlineMs);
    if (extraPage) {
      pages.push(extraPage);
    }
  }

  return { pages, robotsExtrasSkipped, crawlDelayMsApplied };
}

export async function fetchTieredPages(companyUrl: string): Promise<{
  pages: FetchedPage[];
  baseHref: string;
  coverage: SnapshotScanCoverage;
}> {
  const baseHref = await validatePublicAuditUrl(companyUrl);
  const totalBudgetMs = getSnapshotFetchBudgetMs();
  const startedAtMs = Date.now();
  const deadlineMs = startedAtMs + totalBudgetMs;

  const origin = new URL(baseHref).origin;
  const robotsPolicy = await loadSnapshotRobotsPolicy(origin, deadlineMs);

  if (!robotsSnapshotHomeAllowed(robotsPolicy, origin)) {
    const fallback = await runRobotsFallbackFetch(baseHref, deadlineMs, origin, robotsPolicy);
    return {
      pages: fallback.pages,
      baseHref,
      coverage: buildSnapshotFetchCoverage(totalBudgetMs, startedAtMs, fallback.pages, {
        robotsTxtFetched: robotsPolicy.hadFile,
        robotsHomeDisallowed: true,
        ...(fallback.robotsHeadProbe ? { robotsHeadProbe: fallback.robotsHeadProbe } : {}),
        robotsFallbackSiteClass: fallback.robotsFallbackSiteClass,
        robotsExtrasSkipped: fallback.robotsExtrasSkipped > 0 ? fallback.robotsExtrasSkipped : undefined,
        crawlDelayMsApplied: fallback.crawlDelayMsApplied > 0 ? fallback.crawlDelayMsApplied : undefined,
      }),
    };
  }

  const homeResult = await fetchHomePage(baseHref, deadlineMs);
  if (!homeResult.ok) {
    return {
      pages: [],
      baseHref,
      coverage: buildSnapshotFetchCoverage(totalBudgetMs, startedAtMs, [], {
        robotsTxtFetched: robotsPolicy.hadFile,
        homeFetchFailure: homeResult.reason,
      }),
    };
  }

  const playwrightEligible = htmlLooksLikeClientShell(homeResult.page.html);
  let homePage = homeResult.page;
  let playwrightUsed = false;

  if (SYSTEM_DEFAULTS.snapshotTieredFetch.playwrightEnabled && playwrightEligible) {
    const upgraded = await maybeUpgradeHomeWithPlaywright(homePage, deadlineMs);
    homePage = upgraded.page;
    playwrightUsed = upgraded.used;
  }

  const extras = await appendExtraPages(homePage, robotsPolicy, deadlineMs);
  const pageAnomaly = detectPageAnomalies(homePage.html, homePage.finalUrl);

  return {
    pages: extras.pages,
    baseHref,
    coverage: buildSnapshotFetchCoverage(totalBudgetMs, startedAtMs, extras.pages, {
      playwrightEligible,
      playwrightUsed,
      robotsTxtFetched: robotsPolicy.hadFile,
      robotsExtrasSkipped: extras.robotsExtrasSkipped > 0 ? extras.robotsExtrasSkipped : undefined,
      crawlDelayMsApplied: extras.crawlDelayMsApplied > 0 ? extras.crawlDelayMsApplied : undefined,
      ...pageAnomaly,
    }),
  };
}
