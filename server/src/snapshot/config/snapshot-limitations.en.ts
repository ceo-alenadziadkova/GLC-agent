/**
 * User-facing limitation lines for free snapshot (English).
 * Shown when crawl coverage is partial or degraded.
 */

export const SNAPSHOT_LIMITATION_ROBOTS_PARTIAL_ROOT =
  'Root URL was not downloaded; scores use other allowed same-origin pages only — treat as directional.';

export const SNAPSHOT_LIMITATION_ROBOTS_PARTIAL_MAJOR_PLATFORM =
  'Typical for large platforms: strict crawl control on `/`, not a verdict on the business.';

export const SNAPSHOT_LIMITATION_ROBOTS_PARTIAL_ALLOW_HOMEPAGE =
  'To include the homepage, allow this path in robots.txt or submit a URL that is explicitly allowed.';

export function snapshotLimitationRobotsHeadProbe(status: number): string {
  return `HEAD on homepage: HTTP ${status} (no HTML body).`;
}

export const SNAPSHOT_LIMITATION_ROBOTS_MAJOR_PLATFORM_PLACEHOLDER =
  'Large-site pattern: root often disallows bots — scores below are placeholders only.';

export const SNAPSHOT_LIMITATION_ROBOTS_HOMEPAGE_NOT_FETCHED =
  'Homepage HTML not fetched (crawl policy / robots.txt).';

export const SNAPSHOT_LIMITATION_HOME_NON_HTML = [
  'The homepage returned a non-HTML response (for example JSON, PDF, or API output), so the snapshot parser cannot run.',
] as const;

export const SNAPSHOT_LIMITATION_HOME_HTTP_ERROR = [
  'The homepage returned an HTTP error instead of a successful HTML page.',
] as const;

export const SNAPSHOT_LIMITATION_HOME_EMPTY_BODY = ['The homepage response had an empty body.'] as const;

export const SNAPSHOT_LIMITATION_HOME_NETWORK_OR_TIMEOUT = [
  'The homepage could not be retrieved in time (network error, timeout, TLS failure, or blocking).',
] as const;

export const SNAPSHOT_LIMITATION_HOME_FETCH_DEFAULT = [
  'The homepage could not be retrieved within the time budget (timeout, blocking, TLS, or network error).',
] as const;

/** Scan basis when no HTML pages were successfully sampled. */
export const SNAPSHOT_DEGRADED_EMPTY_PAGES_SCAN_BASIS =
  'No HTML pages were sampled; heuristic scoring was not applied.';
