import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockValidatePublicAuditUrl = vi.fn();
const mockGetSnapshotFetchBudgetMs = vi.fn();
const mockLoadSnapshotRobotsPolicy = vi.fn();
const mockRunRobotsFallbackFetch = vi.fn();
const mockFetchHomePage = vi.fn();
const mockMaybeUpgradeHomeWithPlaywright = vi.fn();
const mockDetectPageAnomalies = vi.fn();
const mockDiscoverCandidateUrls = vi.fn();
const mockFetchExtraPage = vi.fn();

vi.mock('../lib/public-http-url.js', () => ({
  validatePublicAuditUrl: (...args: unknown[]) => mockValidatePublicAuditUrl(...args),
}));

vi.mock('../config/snapshot-fetch-budget.js', () => ({
  getSnapshotFetchBudgetMs: (...args: unknown[]) => mockGetSnapshotFetchBudgetMs(...args),
}));

vi.mock('../snapshot/services/fetch-tiered-robots-fallback.service.js', () => ({
  loadSnapshotRobotsPolicy: (...args: unknown[]) => mockLoadSnapshotRobotsPolicy(...args),
  runRobotsFallbackFetch: (...args: unknown[]) => mockRunRobotsFallbackFetch(...args),
}));

vi.mock('../snapshot/services/http/snapshot-http-fetch.service.js', () => ({
  fetchHomePage: (...args: unknown[]) => mockFetchHomePage(...args),
  fetchExtraPage: (...args: unknown[]) => mockFetchExtraPage(...args),
}));

vi.mock('../snapshot/services/fetch-tiered-playwright.service.js', () => ({
  maybeUpgradeHomeWithPlaywright: (...args: unknown[]) => mockMaybeUpgradeHomeWithPlaywright(...args),
}));

vi.mock('../snapshot/page-anomaly.js', () => ({
  detectPageAnomalies: (...args: unknown[]) => mockDetectPageAnomalies(...args),
}));

vi.mock('../snapshot/domain/url-discovery.js', () => ({
  discoverCandidateUrls: (...args: unknown[]) => mockDiscoverCandidateUrls(...args),
}));

import { fetchTieredPages } from '../snapshot/fetch-tiered.js';
import { inferSnapshotPageRole } from '../snapshot/domain/page-role.js';

describe('fetch-tiered refactor contract', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockValidatePublicAuditUrl.mockResolvedValue('https://example.com/');
    mockGetSnapshotFetchBudgetMs.mockReturnValue(10_000);
    mockLoadSnapshotRobotsPolicy.mockResolvedValue({
      hadFile: true,
      crawlDelayMs: 0,
    });
    mockDetectPageAnomalies.mockReturnValue({});
    mockDiscoverCandidateUrls.mockReturnValue([]);
    mockFetchExtraPage.mockResolvedValue(null);
  });

  it('returns robots fallback coverage when homepage is disallowed', async () => {
    mockLoadSnapshotRobotsPolicy.mockResolvedValue({
      hadFile: true,
      crawlDelayMs: 0,
      robotsBody: 'User-agent: *\nDisallow: /',
      robotsResourceUrl: 'https://example.com/robots.txt',
    });
    mockRunRobotsFallbackFetch.mockResolvedValue({
      pages: [],
      robotsFallbackSiteClass: 'standard',
      robotsHeadProbe: { status: 403, uaUsed: 'glc_scanner' },
      robotsExtrasSkipped: 2,
      crawlDelayMsApplied: 0,
    });

    const result = await fetchTieredPages('https://example.com');

    expect(result.baseHref).toBe('https://example.com/');
    expect(result.pages).toEqual([]);
    expect(result.coverage.robotsTxtFetched).toBe(true);
    expect(result.coverage.robotsHomeDisallowed).toBe(true);
    expect(result.coverage.robotsFallbackSiteClass).toBe('standard');
    expect(result.coverage.robotsExtrasSkipped).toBe(2);
  });

  it('returns homeFetchFailure when homepage fetch fails and robots allow home', async () => {
    mockLoadSnapshotRobotsPolicy.mockResolvedValue({
      hadFile: false,
      crawlDelayMs: 0,
    });
    mockFetchHomePage.mockResolvedValue({
      ok: false,
      reason: 'non_html',
    });

    const result = await fetchTieredPages('https://example.com');

    expect(result.pages).toEqual([]);
    expect(result.coverage.homeFetchFailure).toBe('non_html');
    expect(result.coverage.robotsTxtFetched).toBe(false);
  });

  it('keeps page-role classification behavior', () => {
    expect(inferSnapshotPageRole('/')).toBe('home');
    expect(inferSnapshotPageRole('/about-us')).toBe('about');
    expect(inferSnapshotPageRole('/pricing')).toBe('pricing');
    expect(inferSnapshotPageRole('/contact')).toBe('contact');
    expect(inferSnapshotPageRole('/services/cloud')).toBe('services');
    expect(inferSnapshotPageRole('/blog/post')).toBe('other');
  });

  it('builds coverage with homepage when fetch succeeds', async () => {
    mockLoadSnapshotRobotsPolicy.mockResolvedValue({
      hadFile: true,
      crawlDelayMs: 0,
    });
    mockFetchHomePage.mockResolvedValue({
      ok: true,
      page: {
        url: 'https://example.com/',
        finalUrl: 'https://example.com/',
        status: 200,
        html: '<html><body><main>Hello</main></body></html>',
      },
    });
    mockMaybeUpgradeHomeWithPlaywright.mockResolvedValue({
      page: {
        url: 'https://example.com/',
        finalUrl: 'https://example.com/',
        status: 200,
        html: '<html><body><main>Hello</main></body></html>',
      },
      used: false,
    });

    const result = await fetchTieredPages('https://example.com');
    expect(result.pages).toHaveLength(1);
    expect(result.coverage.pagesFetched).toBe(1);
    expect(result.coverage.pages[0]?.role).toBe('home');
  });
});
