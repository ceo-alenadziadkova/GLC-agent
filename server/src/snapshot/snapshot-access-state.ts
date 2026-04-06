/**
 * Detect degraded / robots-blocked snapshot outcomes from `audit_domains.raw_data.snapshot_deterministic`.
 *
 * Public GET completed body: `computePublicSnapshotAccessFlags` is authoritative for JSON (legacy rows +
 * merge edge cases). SPA portal: use `getSnapshotAccessBlockedState` in `src/app/lib/snapshot-diagnostics.ts`
 * for UI; it mirrors these rules when persisted `snapshot_access_*` flags are missing or stale.
 */

import type { FreeSnapshotPreview } from '../types/audit.js';

export type SnapshotAccessBlockedFromDeterministic = {
  showCallout: boolean;
  robotsBlocked: boolean;
  /** True when scan is degraded, robots did not block, and no HTML pages were fetched. */
  noHtmlSample: boolean;
};

function limitationsLookLikeRobots(limitations: unknown): boolean {
  if (!Array.isArray(limitations)) return false;
  return limitations.some(raw => {
    const t = String(raw).toLowerCase();
    return (
      t.includes('robots.txt') &&
      (t.includes('disallow') || t.includes('disallows') || t.includes('crawler'))
    );
  });
}

function covRobotsHomeDisallowed(cov: Record<string, unknown> | undefined): boolean {
  if (!cov || typeof cov !== 'object') return false;
  return cov.robots_home_disallowed === true || cov.robotsHomeDisallowed === true;
}

/**
 * @param det — `raw_data.snapshot_deterministic` object or undefined
 */
export function getSnapshotAccessBlockedFromDeterministic(
  det: Record<string, unknown> | undefined | null,
): SnapshotAccessBlockedFromDeterministic {
  if (!det || typeof det !== 'object') {
    return { showCallout: false, robotsBlocked: false, noHtmlSample: false };
  }

  const scanBasis = det.scan_basis_code;
  const cov = det.scan_coverage as Record<string, unknown> | undefined;
  const robotsHome = covRobotsHomeDisallowed(cov);

  const degraded = scanBasis === 'degraded';
  const robotsBlocked =
    robotsHome || (degraded && limitationsLookLikeRobots(det.limitations));

  const pagesFetchedRaw = cov?.pages_fetched ?? cov?.pagesFetched;
  const pagesFetched = typeof pagesFetchedRaw === 'number' ? pagesFetchedRaw : undefined;
  const noHtmlSample =
    degraded &&
    !robotsBlocked &&
    (typeof pagesFetched !== 'number' || !Number.isFinite(pagesFetched) || pagesFetched < 1);

  return {
    showCallout: robotsBlocked || noHtmlSample,
    robotsBlocked,
    noHtmlSample,
  };
}

/** Fields persisted under snapshot_deterministic (snake_case booleans). */
export function snapshotPayloadToAccessApiFields(args: {
  scanBasisCode?: string;
  limitations?: string[];
  scanCoverage?: { pagesFetched: number; robotsHomeDisallowed?: boolean };
}): Record<string, unknown> {
  const det: Record<string, unknown> = {
    scan_basis_code: args.scanBasisCode,
    limitations: args.limitations,
  };
  if (args.scanCoverage) {
    det.scan_coverage = {
      pages_fetched: args.scanCoverage.pagesFetched,
      ...(args.scanCoverage.robotsHomeDisallowed === true ? { robots_home_disallowed: true } : {}),
    };
  }
  const a = getSnapshotAccessBlockedFromDeterministic(det);
  if (!a.showCallout) return {};
  return {
    snapshot_access_blocked: true,
    snapshot_access_robots_blocked: a.robotsBlocked,
  };
}

/**
 * Authoritative flags for GET /api/snapshot completed body (covers old rows + merge edge cases).
 */
export function computePublicSnapshotAccessFlags(
  preview: FreeSnapshotPreview,
  det: Record<string, unknown> | undefined | null,
): { blocked: boolean; robots: boolean } {
  const previewRobotsHomeDisallowed = preview.scan_coverage?.robots_home_disallowed === true;

  const fromDet = getSnapshotAccessBlockedFromDeterministic(det);
  if (fromDet.showCallout) {
    return { blocked: true, robots: fromDet.robotsBlocked };
  }
  if (previewRobotsHomeDisallowed) {
    return { blocked: true, robots: true };
  }
  const summary = preview.ux_summary ?? '';
  const st = summary.toLowerCase();
  if (
    st.includes('robots.txt') &&
    (st.includes('disallow') || st.includes('disallows') || st.includes('crawler'))
  ) {
    return { blocked: true, robots: true };
  }
  if (summary.includes('No automated GLC snapshot score')) {
    return { blocked: true, robots: false };
  }
  if (
    preview.scan_basis_code === 'degraded' &&
    typeof preview.overall_score === 'number' &&
    preview.overall_score === 0
  ) {
    return {
      blocked: true,
      robots: previewRobotsHomeDisallowed,
    };
  }
  return { blocked: false, robots: false };
}
