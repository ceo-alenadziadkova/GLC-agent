import { afterEach, describe, expect, it, vi } from 'vitest';
import { APP_ROUTE_PATHS, buildAppRoute } from '../../../config/route-paths';
import { getSafeNextPath, resolvePostLoginPath } from './login-navigation-policy';

describe('login-navigation-policy', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('returns null for unsafe next path values', () => {
    vi.stubGlobal('window', { location: { origin: 'https://app.test' } });
    expect(getSafeNextPath('https://evil.com')).toBeNull();
    expect(getSafeNextPath('//evil.com')).toBeNull();
    expect(getSafeNextPath(APP_ROUTE_PATHS.login)).toBeNull();
  });

  it('keeps path, query and hash for safe next path', () => {
    vi.stubGlobal('window', { location: { origin: 'https://app.test' } });
    expect(getSafeNextPath('/reports/123?tab=score#section')).toBe('/reports/123?tab=score#section');
  });

  it('resolves discovery redirect with higher priority', () => {
    const resolved = resolvePostLoginPath({ search: '?next=/reports/1', hasDiscoveryToken: true });
    expect(resolved).toBe(buildAppRoute.auditNewFromDiscovery());
  });

  it('falls back to portfolio when next is absent', () => {
    vi.stubGlobal('window', { location: { origin: 'https://app.test' } });
    const resolved = resolvePostLoginPath({ search: '', hasDiscoveryToken: false });
    expect(resolved).toBe(APP_ROUTE_PATHS.portfolio);
  });
});
