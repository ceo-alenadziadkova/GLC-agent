import type { SiteProfile, SnapshotScanCoverage } from '../types.js';
import {
  SNAPSHOT_LIMITATION_HOME_EMPTY_BODY,
  SNAPSHOT_LIMITATION_HOME_FETCH_DEFAULT,
  SNAPSHOT_LIMITATION_HOME_HTTP_ERROR,
  SNAPSHOT_LIMITATION_HOME_NETWORK_OR_TIMEOUT,
  SNAPSHOT_LIMITATION_HOME_NON_HTML,
  SNAPSHOT_LIMITATION_ROBOTS_HOMEPAGE_NOT_FETCHED,
  SNAPSHOT_LIMITATION_ROBOTS_MAJOR_PLATFORM_PLACEHOLDER,
  SNAPSHOT_LIMITATION_ROBOTS_PARTIAL_ALLOW_HOMEPAGE,
  SNAPSHOT_LIMITATION_ROBOTS_PARTIAL_MAJOR_PLATFORM,
  SNAPSHOT_LIMITATION_ROBOTS_PARTIAL_ROOT,
  snapshotLimitationRobotsHeadProbe,
} from '../config/snapshot-limitations.en.js';

export function applyRobotsFallbackProfileNotes(
  profile: SiteProfile,
  coverage: SnapshotScanCoverage,
): SiteProfile {
  if (!coverage.robotsHomeDisallowed) return profile;
  const signals = [...profile.businessSignals];
  if (coverage.robotsFallbackSiteClass === 'major_platform') {
    if (!signals.includes('robots_major_platform_crawl_control')) {
      signals.push('robots_major_platform_crawl_control');
    }
  } else if (coverage.pagesFetched > 0) {
    if (!signals.includes('robots_home_blocked_sampled_alt_paths')) {
      signals.push('robots_home_blocked_sampled_alt_paths');
    }
  }
  return { ...profile, businessSignals: signals };
}

export function buildRobotsPartialScanLimitations(coverage: SnapshotScanCoverage): string[] {
  if (!coverage.robotsHomeDisallowed || coverage.pagesFetched < 1) return [];
  const lines = [SNAPSHOT_LIMITATION_ROBOTS_PARTIAL_ROOT];
  if (coverage.robotsFallbackSiteClass === 'major_platform') {
    lines.push(SNAPSHOT_LIMITATION_ROBOTS_PARTIAL_MAJOR_PLATFORM);
  } else {
    lines.push(SNAPSHOT_LIMITATION_ROBOTS_PARTIAL_ALLOW_HOMEPAGE);
  }
  return lines;
}

export function buildDegradedLimitations(coverage: SnapshotScanCoverage): string[] {
  if (coverage.robotsHomeDisallowed) {
    const lines: string[] = [];
    if (coverage.robotsHeadProbe) {
      const hp = coverage.robotsHeadProbe;
      lines.push(snapshotLimitationRobotsHeadProbe(hp.status));
    }
    if (coverage.robotsFallbackSiteClass === 'major_platform') {
      lines.push(SNAPSHOT_LIMITATION_ROBOTS_MAJOR_PLATFORM_PLACEHOLDER);
    }
    if (lines.length === 0) {
      lines.push(SNAPSHOT_LIMITATION_ROBOTS_HOMEPAGE_NOT_FETCHED);
    }
    return lines;
  }
  switch (coverage.homeFetchFailure) {
    case 'non_html':
      return [...SNAPSHOT_LIMITATION_HOME_NON_HTML];
    case 'http_error':
      return [...SNAPSHOT_LIMITATION_HOME_HTTP_ERROR];
    case 'empty_body':
      return [...SNAPSHOT_LIMITATION_HOME_EMPTY_BODY];
    case 'network_or_timeout':
      return [...SNAPSHOT_LIMITATION_HOME_NETWORK_OR_TIMEOUT];
    default:
      return [...SNAPSHOT_LIMITATION_HOME_FETCH_DEFAULT];
  }
}
