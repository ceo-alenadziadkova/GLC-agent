import { describe, expect, it } from 'vitest';
import { normalizeScanCoverageFromStoredJson } from '../snapshot/scan-coverage-from-stored-json.js';

describe('normalizeScanCoverageFromStoredJson', () => {
  it('returns null for non-objects', () => {
    expect(normalizeScanCoverageFromStoredJson(null)).toBeNull();
    expect(normalizeScanCoverageFromStoredJson([])).toBeNull();
    expect(normalizeScanCoverageFromStoredJson('x')).toBeNull();
  });

  it('normalizes snake_case robots + pages', () => {
    const r = normalizeScanCoverageFromStoredJson({
      budget_ms: 10_000,
      elapsed_ms: 100,
      pages_fetched: 0,
      max_pages_planned: 4,
      pages: [],
      robots_home_disallowed: true,
    });
    expect(r).not.toBeNull();
    expect(r!.robots_home_disallowed).toBe(true);
    expect(r!.pages_fetched).toBe(0);
  });

  it('maps robots_head_probe and robots_fallback_site_class', () => {
    const r = normalizeScanCoverageFromStoredJson({
      budget_ms: 1,
      elapsed_ms: 0,
      pages_fetched: 1,
      max_pages_planned: 4,
      pages: [{ final_url: 'https://a.test/', status: 200, role: 'home' }],
      robots_home_disallowed: true,
      robots_head_probe: { status: 403, content_type: 'text/html', ua_used: 'glc_scanner' },
      robots_fallback_site_class: 'major_platform',
    });
    expect(r!.robots_head_probe?.status).toBe(403);
    expect(r!.robots_head_probe?.ua_used).toBe('glc_scanner');
    expect(r!.robots_fallback_site_class).toBe('major_platform');
  });

  it('accepts camelCase keys', () => {
    const r = normalizeScanCoverageFromStoredJson({
      budgetMs: 5000,
      elapsedMs: 1,
      pagesFetched: 2,
      maxPagesPlanned: 4,
      pages: [{ finalUrl: 'https://b.test/p', status: 200, role: 'contact' }],
    });
    expect(r!.budget_ms).toBe(5000);
    expect(r!.pages[0]?.final_url).toBe('https://b.test/p');
    expect(r!.pages[0]?.role).toBe('contact');
  });
});
