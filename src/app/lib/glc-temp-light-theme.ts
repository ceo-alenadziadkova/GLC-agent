import { APP_ROUTE_PATHS } from '../config/route-paths';
import { APP_ROUTE_SEGMENTS as P } from '@glc/intake-core';

/**
 * When true, `getResolvedGlcDark` always resolves to dark on public marketing
 * and login — light theme is not offered there until the product is ready.
 * Remove or set to `false` to re-enable the light theme on these routes.
 */
export const GLC_TEMP_DISABLE_LIGHT_ON_MARKETING_AND_LOGIN = true;

const LEGAL_PATH_PREFIX = '/legal/';

function normalizePathname(pathname: string): string {
  if (pathname === '' || pathname === '/') {
    return '/';
  }
  return pathname.replace(/\/$/, '') || '/';
}

/**
 * Public marketing shell + login: force effective dark color scheme
 * (see `GLC_TEMP_DISABLE_LIGHT_ON_MARKETING_AND_LOGIN`).
 */
export function isGlcTempLightThemeDisabledForPathname(pathname: string): boolean {
  if (!GLC_TEMP_DISABLE_LIGHT_ON_MARKETING_AND_LOGIN) {
    return false;
  }

  const p = normalizePathname(pathname);
  if (p === APP_ROUTE_PATHS.home) {
    return true;
  }
  if (p === APP_ROUTE_PATHS.login) {
    return true;
  }
  if (p === APP_ROUTE_PATHS.faq) {
    return true;
  }
  if (p === APP_ROUTE_PATHS.brief) {
    return true;
  }
  if (p === APP_ROUTE_PATHS.discovery) {
    return true;
  }
  if (p === `/${P.discoveryPublicLegacy}`) {
    return true;
  }
  if (p === APP_ROUTE_PATHS.snapshot) {
    return true;
  }
  if (
    p === APP_ROUTE_PATHS.starterPackage ||
    p === APP_ROUTE_PATHS.proPackage ||
    p === APP_ROUTE_PATHS.completePackage
  ) {
    return true;
  }
  if (p === '/express-audit') {
    return true;
  }
  if (p.startsWith(LEGAL_PATH_PREFIX)) {
    return true;
  }
  return false;
}
