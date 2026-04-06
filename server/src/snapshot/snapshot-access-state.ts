/**
 * Detect degraded / robots-blocked snapshot outcomes from `audit_domains.raw_data.snapshot_deterministic`
 * (mirrors frontend `getSnapshotAccessBlockedState` for upgrade + logging).
 */

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
    return t.includes('robots.txt') && (t.includes('disallow') || t.includes('crawler'));
  });
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
  const robotsHome =
    cov !== undefined && cov !== null && typeof cov === 'object' && cov.robots_home_disallowed === true;

  const degraded = scanBasis === 'degraded';
  const robotsBlocked =
    robotsHome || (degraded && limitationsLookLikeRobots(det.limitations));

  const pagesFetched = cov?.pages_fetched;
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
