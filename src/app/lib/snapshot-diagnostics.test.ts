import { describe, it, expect } from 'vitest';
import type { FreeSnapshotPreview, SnapshotScanCoverageApi } from '../data/auditTypes';
import {
  formatScanCoverageLine,
  snapshotZeroPagesScoreNote,
  scanConfidenceExplanation,
  isAiVisibilityGap,
  isRobotsHomeBlockingSnapshot,
  isSnapshotWithoutFetchedPages,
  getSnapshotAccessBlockedState,
} from './snapshot-diagnostics';

function baseCov(over: Partial<SnapshotScanCoverageApi>): SnapshotScanCoverageApi {
  return {
    budget_ms: 10000,
    elapsed_ms: 1000,
    pages_fetched: 1,
    max_pages_planned: 4,
    pages: [{ final_url: 'https://x/', status: 200, role: 'home' }],
    ...over,
  };
}

describe('formatScanCoverageLine', () => {
  it('returns null for undefined', () => {
    expect(formatScanCoverageLine(undefined)).toBeNull();
  });

  it('describes robots block with zero pages', () => {
    const line = formatScanCoverageLine(
      baseCov({ robots_home_disallowed: true, pages_fetched: 0, pages: [] }),
    );
    expect(line).toContain('homepage blocked');
  });

  it('describes limited sample when robots block but pages fetched', () => {
    const line = formatScanCoverageLine(
      baseCov({
        robots_home_disallowed: true,
        pages_fetched: 2,
        robots_fallback_site_class: 'major_platform',
        pages: [
          { final_url: 'https://x/c', status: 200, role: 'contact' },
          { final_url: 'https://x/p', status: 200, role: 'pricing' },
        ],
      }),
    );
    expect(line).toContain('2 allowed page');
    expect(line).toContain('Common on large sites');
  });

  it('mentions playwright_used', () => {
    const line = formatScanCoverageLine(baseCov({ playwright_used: true }));
    expect(line).toContain('headless browser');
  });
});

describe('snapshotZeroPagesScoreNote', () => {
  it('returns note when overall 0 and no pages', () => {
    const r = {
      overall_score: 0,
      scan_coverage: { pages_fetched: 0 },
    } as FreeSnapshotPreview;
    expect(snapshotZeroPagesScoreNote(r)).toContain('0 pages sampled');
  });

  it('returns null when pages were fetched', () => {
    const r = {
      overall_score: 0,
      scan_coverage: baseCov({ pages_fetched: 1 }),
    } as FreeSnapshotPreview;
    expect(snapshotZeroPagesScoreNote(r)).toBeNull();
  });
});

describe('scanConfidenceExplanation', () => {
  it('covers all bands', () => {
    expect(scanConfidenceExplanation('high').length).toBeGreaterThan(20);
    expect(scanConfidenceExplanation('medium')).toContain('directional');
    expect(scanConfidenceExplanation('low')).toContain('rough');
  });
});

describe('isAiVisibilityGap', () => {
  it('narrows type for known keys', () => {
    expect(isAiVisibilityGap('robots_txt')).toBe(true);
    expect(isAiVisibilityGap('unknown')).toBe(false);
  });
});

describe('isRobotsHomeBlockingSnapshot', () => {
  it('true when scan_coverage flag', () => {
    expect(isRobotsHomeBlockingSnapshot({ scan_coverage: { robots_home_disallowed: true } })).toBe(true);
  });

  it('true for degraded + limitations mention', () => {
    expect(
      isRobotsHomeBlockingSnapshot({
        scan_basis_code: 'degraded',
        limitations: ['robots.txt Disallow for crawler'],
      }),
    ).toBe(true);
  });

  it('false when not degraded without flag', () => {
    expect(isRobotsHomeBlockingSnapshot({ scan_basis_code: 'full' })).toBe(false);
  });
});

describe('isSnapshotWithoutFetchedPages', () => {
  it('true when degraded and pages_fetched < 1', () => {
    expect(
      isSnapshotWithoutFetchedPages({
        scan_basis_code: 'degraded',
        scan_coverage: baseCov({ pages_fetched: 0, pages: [] }),
      }),
    ).toBe(true);
  });

  it('false when not degraded', () => {
    expect(
      isSnapshotWithoutFetchedPages({
        scan_basis_code: 'full',
        scan_coverage: baseCov({ pages_fetched: 0, pages: [] }),
      }),
    ).toBe(false);
  });
});

describe('getSnapshotAccessBlockedState', () => {
  it('honors snapshot_access_blocked from API', () => {
    const s = getSnapshotAccessBlockedState({
      snapshot_access_blocked: true,
      snapshot_access_robots_blocked: true,
      scan_coverage: baseCov({ robots_home_disallowed: true, pages_fetched: 1 }),
    } as FreeSnapshotPreview);
    expect(s.showCallout).toBe(true);
    expect(s.robotsBlocked).toBe(true);
    expect(s.robotsLimitedSample).toBe(true);
  });

  it('infers robots from ux_summary', () => {
    const s = getSnapshotAccessBlockedState({
      ux_summary: 'Blocked by robots.txt disallow rule',
      scan_basis_code: 'full',
    } as FreeSnapshotPreview);
    expect(s.robotsBlocked).toBe(true);
    expect(s.showCallout).toBe(true);
  });
});
