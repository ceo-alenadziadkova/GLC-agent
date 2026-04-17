/**
 * Shared snapshot scan diagnostics copy and formatting (SnapshotLanding + client portal).
 */

import type { FreeSnapshotPreview, SnapshotScanCoverageApi } from '../data/auditTypes';
import { SNAPSHOT_DIAGNOSTICS_COPY } from '../config/snapshot-diagnostics-copy.en';

/** User-facing copy for `ai_visibility.gaps`. */
export const AI_VISIBILITY_GAP_COPY: Record<
  'robots_txt' | 'sitemap_html' | 'structured_data' | 'discovery_files',
  string
> = SNAPSHOT_DIAGNOSTICS_COPY.aiVisibilityGap;

const SCAN_ROLE_LABELS: Record<SnapshotScanCoverageApi['pages'][number]['role'], string> = {
  home: 'homepage',
  contact: 'contact',
  pricing: 'pricing',
  about: 'about',
  services: 'services',
  other: 'other pages',
};

export function formatScanCoverageLine(cov: SnapshotScanCoverageApi | undefined): string | null {
  if (!cov) return null;
  if (cov.robots_home_disallowed) {
    if (typeof cov.pages_fetched === 'number' && cov.pages_fetched > 0) {
      const cls = cov.robots_fallback_site_class;
      const plat =
        cls === 'major_platform'
          ? SNAPSHOT_DIAGNOSTICS_COPY.robotsFallbackMajorPlatform
          : SNAPSHOT_DIAGNOSTICS_COPY.robotsFallbackGeneric;
      return `Sampled ${cov.pages_fetched} allowed page(s); homepage not fetched (crawl policy). ${plat}`;
    }
    return SNAPSHOT_DIAGNOSTICS_COPY.robotsNoHtmlSample;
  }
  if (cov.pages_fetched < 1) return null;
  const order: SnapshotScanCoverageApi['pages'][number]['role'][] = [
    'home',
    'contact',
    'pricing',
    'about',
    'services',
    'other',
  ];
  const seen = new Set<string>();
  const labels: string[] = [];
  for (const r of order) {
    if (!cov.pages.some(p => p.role === r)) continue;
    const lb = SCAN_ROLE_LABELS[r];
    if (!seen.has(lb)) {
      seen.add(lb);
      labels.push(lb);
    }
  }
  const sample = labels.length > 0 ? labels.join(', ') : `${cov.pages_fetched} page(s)`;
  const sec = (cov.elapsed_ms / 1000).toFixed(1);
  const budgetSec = (cov.budget_ms / 1000).toFixed(0);
  let line = SNAPSHOT_DIAGNOSTICS_COPY.sampledPattern
    .replace('{pagesFetched}', String(cov.pages_fetched))
    .replace('{maxPages}', String(cov.max_pages_planned))
    .replace('{elapsedSec}', sec)
    .replace('{budgetSec}', budgetSec)
    .replace('{sample}', sample);
  if (cov.playwright_used) {
    line += ` ${SNAPSHOT_DIAGNOSTICS_COPY.renderedInBrowser}`;
  } else if (cov.playwright_eligible) {
    line += ` ${SNAPSHOT_DIAGNOSTICS_COPY.appShellHint}`;
  }
  if (cov.robots_extras_skipped && cov.robots_extras_skipped > 0) {
    line += ` ${SNAPSHOT_DIAGNOSTICS_COPY.robotsExtrasSkipped.replace('{count}', String(cov.robots_extras_skipped))}`;
  }
  if (cov.challenge_page_likely) {
    line += ` ${SNAPSHOT_DIAGNOSTICS_COPY.challengeLikely}`;
  }
  if (cov.parked_domain_likely) {
    line += ` ${SNAPSHOT_DIAGNOSTICS_COPY.parkedDomainLikely}`;
  }
  if (cov.login_wall_likely) {
    line += ` ${SNAPSHOT_DIAGNOSTICS_COPY.loginWallLikely}`;
  }
  return line;
}

/** When the donut shows 0/100 and no pages were fetched — avoid repeating long robots copy elsewhere. */
export function snapshotZeroPagesScoreNote(result: FreeSnapshotPreview): string | null {
  const pf = result.scan_coverage?.pages_fetched;
  const zeroish = typeof pf !== 'number' || pf < 1;
  if (!zeroish) return null;
  if (typeof result.overall_score !== 'number' || result.overall_score !== 0) return null;
  return SNAPSHOT_DIAGNOSTICS_COPY.zeroPagesScoreNote;
}

export function scanConfidenceExplanation(band: 'high' | 'medium' | 'low'): string {
  switch (band) {
    case 'high':
      return SNAPSHOT_DIAGNOSTICS_COPY.scanConfidenceHigh;
    case 'medium':
      return SNAPSHOT_DIAGNOSTICS_COPY.scanConfidenceMedium;
    case 'low':
      return SNAPSHOT_DIAGNOSTICS_COPY.scanConfidenceLow;
  }
}

export type SnapshotAiVisibilityGap = keyof typeof AI_VISIBILITY_GAP_COPY;

export function isAiVisibilityGap(x: string): x is SnapshotAiVisibilityGap {
  return x in AI_VISIBILITY_GAP_COPY;
}

/**
 * robots.txt (or equivalent policy) disallows our snapshot crawler from reading the homepage,
 * or the completed payload only describes that situation (coverage merge edge cases).
 */
export function isRobotsHomeBlockingSnapshot(params: {
  scan_coverage?: SnapshotScanCoverageApi;
  scan_basis_code?: FreeSnapshotPreview['scan_basis_code'];
  limitations?: string[];
}): boolean {
  if (params.scan_coverage?.robots_home_disallowed === true) return true;
  if (params.scan_basis_code !== 'degraded') return false;
  return (params.limitations ?? []).some(line => {
    const t = line.toLowerCase();
    return t.includes('robots.txt') && (t.includes('disallow') || t.includes('crawler'));
  });
}

/** Degenerated run: no public HTML pages were successfully sampled for scoring. */
export function isSnapshotWithoutFetchedPages(params: {
  scan_basis_code?: FreeSnapshotPreview['scan_basis_code'];
  scan_coverage?: SnapshotScanCoverageApi;
}): boolean {
  if (params.scan_basis_code !== 'degraded') return false;
  const n = params.scan_coverage?.pages_fetched;
  if (typeof n === 'number') return n < 1;
  return true;
}

/** Stable substring from server `buildSummary` when the deterministic run could not score pages. */
const DEGRADED_SNAPSHOT_SUMMARY_MARK = SNAPSHOT_DIAGNOSTICS_COPY.degradedSnapshotSummaryMark;

function uxSummaryImpliesRobotsBlock(summary: string | null | undefined): boolean {
  if (!summary) return false;
  const t = summary.toLowerCase();
  return t.includes('robots.txt') && (t.includes('disallow') || t.includes('disallows') || t.includes('crawler'));
}

function uxSummaryIsDegradedPlaceholder(summary: string | null | undefined): boolean {
  return typeof summary === 'string' && summary.includes(DEGRADED_SNAPSHOT_SUMMARY_MARK);
}

/**
 * Single place to drive access-blocked UI (public snapshot + portal mirror).
 * Aligns with `computePublicSnapshotAccessFlags` on GET /api/snapshot when persisted flags are absent;
 * see docs/API.md (Public Snapshot) and `freeSnapshotPreviewFromAuditState` file comment.
 */
export function getSnapshotAccessBlockedState(
  result: Pick<
    FreeSnapshotPreview,
    | 'scan_coverage'
    | 'scan_basis_code'
    | 'limitations'
    | 'ux_summary'
    | 'overall_score'
    | 'snapshot_access_blocked'
    | 'snapshot_access_robots_blocked'
  >,
): {
  showCallout: boolean;
  robotsBlocked: boolean;
  noPages: boolean;
  /** Homepage blocked by robots but at least one other allowed page was fetched. */
  robotsLimitedSample: boolean;
  robotsFallbackSiteClass?: SnapshotScanCoverageApi['robots_fallback_site_class'];
} {
  const pagesFetched = result.scan_coverage?.pages_fetched;
  const limitedFromCov =
    result.scan_coverage?.robots_home_disallowed === true &&
    typeof pagesFetched === 'number' &&
    pagesFetched > 0;

  if (result.snapshot_access_blocked === true) {
    const robots = result.snapshot_access_robots_blocked === true;
    const robotsLimitedSample = robots && limitedFromCov;
    return {
      showCallout: true,
      robotsBlocked: robots,
      noPages: !robots,
      robotsLimitedSample,
      robotsFallbackSiteClass: result.scan_coverage?.robots_fallback_site_class,
    };
  }
  const robotsBlocked =
    isRobotsHomeBlockingSnapshot(result) || uxSummaryImpliesRobotsBlock(result.ux_summary);
  const noPages =
    !robotsBlocked &&
    (isSnapshotWithoutFetchedPages(result) || uxSummaryIsDegradedPlaceholder(result.ux_summary));
  const robotsLimitedSample = robotsBlocked && limitedFromCov;
  return {
    showCallout: robotsBlocked || noPages,
    robotsBlocked,
    noPages,
    robotsLimitedSample,
    robotsFallbackSiteClass: result.scan_coverage?.robots_fallback_site_class,
  };
}
