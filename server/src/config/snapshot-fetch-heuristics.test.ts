import { afterEach, describe, expect, it, vi } from 'vitest';

describe('snapshot-fetch-heuristics', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  it('defaults: path hints match typical marketing paths', async () => {
    const m = await import('./snapshot-fetch-heuristics.js');
    expect(m.SNAPSHOT_PATH_HINT_REGEXES.some((re) => re.test('/about'))).toBe(true);
    expect(m.SNAPSHOT_PATH_HINT_REGEXES.some((re) => re.test('/pricing'))).toBe(true);
    expect(m.SNAPSHOT_ROBOTS_FALLBACK_HTML_PATHS).toContain('/contact');
    expect(m.SNAPSHOT_FETCH_ACCEPT_LANGUAGE).toContain('en');
    expect(m.SNAPSHOT_HEAD_ACCEPT_LANGUAGE).toContain('en');
  });

  it('respects SNAPSHOT_FETCH_ACCEPT_LANGUAGE when set before import', async () => {
    vi.stubEnv('SNAPSHOT_FETCH_ACCEPT_LANGUAGE', 'de-DE,de;q=0.9');
    const m = await import('./snapshot-fetch-heuristics.js');
    expect(m.SNAPSHOT_FETCH_ACCEPT_LANGUAGE).toBe('de-DE,de;q=0.9');
  });

  it('parses SNAPSHOT_PATH_HINT_REGEX_JSON', async () => {
    vi.stubEnv('SNAPSHOT_PATH_HINT_REGEX_JSON', JSON.stringify(['\\/foo', '\\/bar']));
    const m = await import('./snapshot-fetch-heuristics.js');
    expect(m.SNAPSHOT_PATH_HINT_REGEXES.some((re) => re.test('/foo'))).toBe(true);
    expect(m.SNAPSHOT_PATH_HINT_REGEXES.some((re) => re.test('/bar'))).toBe(true);
  });
});
