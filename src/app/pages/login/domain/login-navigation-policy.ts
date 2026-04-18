import { APP_ROUTE_PATHS, buildAppRoute } from '../../../config/route-paths';

export function getSafeNextPath(nextRaw: string | null): string | null {
  if (!nextRaw || !nextRaw.startsWith('/') || nextRaw.startsWith('//')) {
    return null;
  }
  try {
    const parsed = new URL(nextRaw, window.location.origin);
    if (parsed.pathname === APP_ROUTE_PATHS.login) {
      return null;
    }
    return `${parsed.pathname}${parsed.search}${parsed.hash}`;
  } catch {
    return null;
  }
}

export function resolvePostLoginPath(params: { search: string; hasDiscoveryToken: boolean }): string {
  if (params.hasDiscoveryToken) {
    return buildAppRoute.auditNewFromDiscovery();
  }
  const nextRaw = new URLSearchParams(params.search).get('next');
  return getSafeNextPath(nextRaw) ?? APP_ROUTE_PATHS.portfolio;
}
