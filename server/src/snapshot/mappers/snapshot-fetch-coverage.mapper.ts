import { SNAPSHOT_MAX_EXTRA_PAGES } from '../../config/snapshot-timing.js';
import { inferSnapshotPageRole } from '../domain/page-role.js';
import type { FetchedPage, SnapshotScanCoverage } from '../types.js';
import type {
  HomeFetchFailureReason,
  RobotsHeadProbeShape,
} from '../types/fetch-tiered.types.js';

type BuildCoverageOptions = {
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
};

export function buildSnapshotFetchCoverage(
  totalBudgetMs: number,
  startedAtMs: number,
  pages: FetchedPage[],
  options?: BuildCoverageOptions,
): SnapshotScanCoverage {
  const elapsedMs = Math.max(0, Date.now() - startedAtMs);

  return {
    budgetMs: totalBudgetMs,
    elapsedMs,
    pagesFetched: pages.length,
    maxPagesPlanned: 1 + SNAPSHOT_MAX_EXTRA_PAGES,
    pages: pages.map(page => {
      let pathname = '/';
      try {
        pathname = new URL(page.finalUrl).pathname;
      } catch {
        // Keep default fallback path.
      }
      return {
        finalUrl: page.finalUrl,
        status: page.status,
        role: inferSnapshotPageRole(pathname),
      };
    }),
    ...(options?.playwrightEligible !== undefined ? { playwrightEligible: options.playwrightEligible } : {}),
    ...(options?.playwrightUsed !== undefined ? { playwrightUsed: options.playwrightUsed } : {}),
    ...(options?.robotsTxtFetched !== undefined ? { robotsTxtFetched: options.robotsTxtFetched } : {}),
    ...(options?.robotsHomeDisallowed !== undefined ? { robotsHomeDisallowed: options.robotsHomeDisallowed } : {}),
    ...(options?.robotsHeadProbe ? { robotsHeadProbe: options.robotsHeadProbe } : {}),
    ...(options?.robotsFallbackSiteClass ? { robotsFallbackSiteClass: options.robotsFallbackSiteClass } : {}),
    ...(options?.robotsExtrasSkipped !== undefined ? { robotsExtrasSkipped: options.robotsExtrasSkipped } : {}),
    ...(options?.crawlDelayMsApplied !== undefined ? { crawlDelayMsApplied: options.crawlDelayMsApplied } : {}),
    ...(options?.homeFetchFailure !== undefined ? { homeFetchFailure: options.homeFetchFailure } : {}),
    ...(options?.challengeLikely === true ? { challengeLikely: true } : {}),
    ...(options?.challengeTaxonomy ? { challengeTaxonomy: options.challengeTaxonomy } : {}),
    ...(options?.parkedLikely === true ? { parkedLikely: true } : {}),
    ...(options?.parkedTaxonomy ? { parkedTaxonomy: options.parkedTaxonomy } : {}),
    ...(options?.loginWallLikely === true ? { loginWallLikely: true } : {}),
    ...(options?.loginWallTaxonomy ? { loginWallTaxonomy: options.loginWallTaxonomy } : {}),
  };
}
