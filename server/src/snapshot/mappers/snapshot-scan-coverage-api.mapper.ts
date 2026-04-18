import type { SnapshotScanCoverageApi } from '../../types/audit.js';
import type { SnapshotScanCoverage } from '../types.js';

export function toApiScanCoverage(c: SnapshotScanCoverage): SnapshotScanCoverageApi {
  return {
    budget_ms: c.budgetMs,
    elapsed_ms: c.elapsedMs,
    pages_fetched: c.pagesFetched,
    max_pages_planned: c.maxPagesPlanned,
    pages: c.pages.map(p => ({
      final_url: p.finalUrl,
      status: p.status,
      role: p.role,
    })),
    ...(c.playwrightEligible !== undefined ? { playwright_eligible: c.playwrightEligible } : {}),
    ...(c.playwrightUsed !== undefined ? { playwright_used: c.playwrightUsed } : {}),
    ...(c.robotsTxtFetched !== undefined ? { robots_txt_fetched: c.robotsTxtFetched } : {}),
    ...(c.robotsHomeDisallowed !== undefined ? { robots_home_disallowed: c.robotsHomeDisallowed } : {}),
    ...(c.robotsHeadProbe
      ? {
          robots_head_probe: {
            status: c.robotsHeadProbe.status,
            ...(c.robotsHeadProbe.contentType ? { content_type: c.robotsHeadProbe.contentType } : {}),
            ...(c.robotsHeadProbe.finalUrl ? { final_url: c.robotsHeadProbe.finalUrl } : {}),
            ...(c.robotsHeadProbe.xRobotsTag ? { x_robots_tag: c.robotsHeadProbe.xRobotsTag } : {}),
            ...(c.robotsHeadProbe.uaUsed ? { ua_used: c.robotsHeadProbe.uaUsed } : {}),
          },
        }
      : {}),
    ...(c.robotsFallbackSiteClass ? { robots_fallback_site_class: c.robotsFallbackSiteClass } : {}),
    ...(c.robotsExtrasSkipped !== undefined ? { robots_extras_skipped: c.robotsExtrasSkipped } : {}),
    ...(c.crawlDelayMsApplied !== undefined ? { crawl_delay_ms_applied: c.crawlDelayMsApplied } : {}),
    ...(c.homeFetchFailure !== undefined ? { home_fetch_failure: c.homeFetchFailure } : {}),
    ...(c.challengeLikely === true ? { challenge_page_likely: true } : {}),
    ...(c.challengeTaxonomy ? { challenge_taxonomy: c.challengeTaxonomy } : {}),
    ...(c.parkedLikely === true ? { parked_domain_likely: true } : {}),
    ...(c.parkedTaxonomy ? { parked_taxonomy: c.parkedTaxonomy } : {}),
    ...(c.loginWallLikely === true ? { login_wall_likely: true } : {}),
    ...(c.loginWallTaxonomy ? { login_wall_taxonomy: c.loginWallTaxonomy } : {}),
  };
}
