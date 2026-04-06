import { describe, it, expect } from 'vitest';
import { deriveScanBasisCode } from '../snapshot/scan-basis-code.js';

describe('deriveScanBasisCode', () => {
  it('returns cache_hit when flag set', () => {
    expect(
      deriveScanBasisCode({
        cacheHit: true,
        pagesFetched: 3,
        playwrightUsed: true,
        degraded: false,
      }),
    ).toBe('cache_hit');
  });

  it('returns degraded when degraded or zero pages', () => {
    expect(
      deriveScanBasisCode({
        cacheHit: false,
        pagesFetched: 0,
        playwrightUsed: false,
        degraded: false,
      }),
    ).toBe('degraded');
    expect(
      deriveScanBasisCode({
        cacheHit: false,
        pagesFetched: 1,
        playwrightUsed: false,
        degraded: true,
      }),
    ).toBe('degraded');
  });

  it('prefers homepage_rendered_fallback when Playwright used', () => {
    expect(
      deriveScanBasisCode({
        cacheHit: false,
        pagesFetched: 3,
        playwrightUsed: true,
        degraded: false,
      }),
    ).toBe('homepage_rendered_fallback');
  });

  it('returns homepage_plus_core_pages when multiple pages and no Playwright', () => {
    expect(
      deriveScanBasisCode({
        cacheHit: false,
        pagesFetched: 2,
        playwrightUsed: false,
        degraded: false,
      }),
    ).toBe('homepage_plus_core_pages');
  });

  it('returns homepage_only for single page static fetch', () => {
    expect(
      deriveScanBasisCode({
        cacheHit: false,
        pagesFetched: 1,
        playwrightUsed: false,
        degraded: false,
      }),
    ).toBe('homepage_only');
  });
});
