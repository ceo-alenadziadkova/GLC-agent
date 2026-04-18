import { afterEach, describe, expect, it, vi } from 'vitest';
import { buildAbsoluteUrlFromOrigin } from './public-app-url';

describe('buildAbsoluteUrlFromOrigin', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('returns pathname only when window is unavailable', () => {
    const g = globalThis as typeof globalThis & { window?: Window & typeof globalThis };
    const prev = g.window;
    try {
           delete g.window;
      expect(buildAbsoluteUrlFromOrigin('/snapshot')).toBe('/snapshot');
      // Without `window`, paths are returned as passed in (no slash normalization).
      expect(buildAbsoluteUrlFromOrigin('snapshot')).toBe('snapshot');
    } finally {
      g.window = prev;
    }
  });

  it('joins origin and normalizes leading slash', () => {
    vi.stubGlobal('window', { location: { origin: 'https://app.test' } });
    expect(buildAbsoluteUrlFromOrigin('/audit/new')).toBe('https://app.test/audit/new');
    expect(buildAbsoluteUrlFromOrigin('login')).toBe('https://app.test/login');
  });
});
