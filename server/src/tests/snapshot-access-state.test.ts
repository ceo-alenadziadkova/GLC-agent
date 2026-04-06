import { describe, expect, it } from 'vitest';
import { getSnapshotAccessBlockedFromDeterministic } from '../snapshot/snapshot-access-state.js';

describe('getSnapshotAccessBlockedFromDeterministic', () => {
  it('returns robots when scan_coverage.robots_home_disallowed', () => {
    const r = getSnapshotAccessBlockedFromDeterministic({
      scan_basis_code: 'degraded',
      scan_coverage: {
        budget_ms: 10_000,
        elapsed_ms: 100,
        pages_fetched: 0,
        max_pages_planned: 4,
        pages: [],
        robots_home_disallowed: true,
      },
    });
    expect(r.robotsBlocked).toBe(true);
    expect(r.noHtmlSample).toBe(false);
    expect(r.showCallout).toBe(true);
  });

  it('infers robots from limitations text when degraded', () => {
    const r = getSnapshotAccessBlockedFromDeterministic({
      scan_basis_code: 'degraded',
      limitations: [
        'robots.txt disallows automated access to the homepage for our snapshot crawler (User-agent * / GLC-SnapshotScanner).',
      ],
    });
    expect(r.robotsBlocked).toBe(true);
    expect(r.noHtmlSample).toBe(false);
    expect(r.showCallout).toBe(true);
  });

  it('returns noHtmlSample for degraded fetch failure without robots flag', () => {
    const r = getSnapshotAccessBlockedFromDeterministic({
      scan_basis_code: 'degraded',
      scan_coverage: {
        budget_ms: 10_000,
        elapsed_ms: 100,
        pages_fetched: 0,
        max_pages_planned: 4,
        pages: [],
        home_fetch_failure: 'http_error',
      },
    });
    expect(r.robotsBlocked).toBe(false);
    expect(r.noHtmlSample).toBe(true);
    expect(r.showCallout).toBe(true);
  });

  it('returns false for normal homepage_only scan', () => {
    const r = getSnapshotAccessBlockedFromDeterministic({
      scan_basis_code: 'homepage_only',
      scan_coverage: {
        budget_ms: 10_000,
        elapsed_ms: 900,
        pages_fetched: 1,
        max_pages_planned: 4,
        pages: [{ final_url: 'https://x.test/', status: 200, role: 'home' }],
      },
    });
    expect(r.showCallout).toBe(false);
  });
});
