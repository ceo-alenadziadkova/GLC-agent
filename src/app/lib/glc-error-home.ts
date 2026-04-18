import { APP_ROUTE_PATHS, APP_ROUTE_PATTERNS } from '../config/route-paths';

/** Where to send users after an app-level error (consultant shell vs marketing vs portal). */
export function resolveGlcErrorHome(pathname: string): { href: string; label: string } {
  if (pathname.startsWith(APP_ROUTE_PATHS.portal)) {
    return { href: APP_ROUTE_PATHS.portal, label: 'Back to portal' };
  }
  const consultantLike =
    pathname.startsWith(APP_ROUTE_PATHS.dashboard) ||
    pathname.startsWith(APP_ROUTE_PATHS.portfolio) ||
    pathname.startsWith('/pipeline/') ||
    pathname.startsWith('/reports/') ||
    pathname.startsWith('/strategy/') ||
    pathname.startsWith(APP_ROUTE_PATHS.settings) ||
    pathname.startsWith('/admin/') ||
    pathname.startsWith(APP_ROUTE_PATHS.auditNew) ||
    APP_ROUTE_PATTERNS.auditById.test(pathname);
  if (consultantLike) {
    return { href: APP_ROUTE_PATHS.dashboard, label: 'Back to dashboard' };
  }
  return { href: APP_ROUTE_PATHS.home, label: 'Home' };
}
