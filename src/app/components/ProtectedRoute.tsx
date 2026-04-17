import { Navigate, useLocation } from 'react-router';
import { useAuth } from '../hooks/useAuth';
import { useProfile } from '../hooks/useProfile';
import { logger } from '../lib/logger';
import type { UserRole } from '../data/auditTypes';
import { SyncPathLoader } from './SyncPathLoader';
import { APP_ROUTE_PATHS } from '../config/route-paths';

interface ProtectedRouteProps {
  children: React.ReactNode;
  /** If provided, the route is only accessible by this role. */
  requiredRole?: UserRole;
  /** Block these roles (e.g. snapshot guests from /settings). */
  blockedForRoles?: UserRole[];
  blockedRedirect?: string;
}

export function ProtectedRoute({
  children,
  requiredRole,
  blockedForRoles,
  blockedRedirect = APP_ROUTE_PATHS.snapshot,
}: ProtectedRouteProps) {
  const { isAuthenticated, loading: authLoading } = useAuth();
  const { role, loading: profileLoading, profile } = useProfile();
  const location = useLocation();

  // Spin while auth resolves, or until we have a profile row on role-gated routes.
  // Do not block when profile reloads for the same session (e.g. repeat SIGNED_IN after tab focus);
  // that would unmount the shell and replay page loaders.
  const loading =
    authLoading ||
    (isAuthenticated && requiredRole != null && profileLoading && !profile);

  if (loading) {
    logger.debug('ProtectedRoute: loading auth/profile state');
    return <SyncPathLoader variant="indeterminate" />;
  }

  if (!isAuthenticated) {
    const next = `${location.pathname}${location.search}${location.hash}`;
    const to = `${APP_ROUTE_PATHS.login}?next=${encodeURIComponent(next)}`;
    logger.info('ProtectedRoute: not authenticated, redirecting to /login', { next });
    return <Navigate to={to} replace />;
  }

  if (blockedForRoles?.length && role != null && blockedForRoles.includes(role)) {
    return <Navigate to={blockedRedirect} replace />;
  }

  if (requiredRole != null && role !== requiredRole) {
    logger.info(`ProtectedRoute: role "${role}" does not match required "${requiredRole}"`);
    // If role is null (profile row missing or server unreachable), redirect to /login
    // so the user re-authenticates and triggers a fresh attachProfile() upsert.
    // Do NOT redirect to a role-guarded route — that causes an infinite redirect loop.
    if (role === null) {
      return <Navigate to={APP_ROUTE_PATHS.login} replace />;
    }
    if (role === 'guest') {
      return <Navigate to={APP_ROUTE_PATHS.snapshot} replace />;
    }
    const redirect = role === 'consultant' ? APP_ROUTE_PATHS.portfolio : APP_ROUTE_PATHS.portal;
    return <Navigate to={redirect} replace />;
  }

  logger.debug('ProtectedRoute: authenticated, render children');
  return <>{children}</>;
}
