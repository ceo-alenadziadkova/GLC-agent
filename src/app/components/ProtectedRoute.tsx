import { Navigate } from 'react-router';
import { useAuth } from '../hooks/useAuth';
import { useProfile } from '../hooks/useProfile';
import { logger } from '../lib/logger';
import type { UserRole } from '../data/auditTypes';
import { SyncPathLoader } from './SyncPathLoader';

interface ProtectedRouteProps {
  children: React.ReactNode;
  /** If provided, the route is only accessible by this role. */
  requiredRole?: UserRole;
}

export function ProtectedRoute({ children, requiredRole }: ProtectedRouteProps) {
  const { isAuthenticated, loading: authLoading } = useAuth();
  const { role, loading: profileLoading } = useProfile();

  // Spin only while auth or profile are actively loading — never block on role value itself,
  // since a null role after loading just means the profile fetch errored (handled below).
  const loading = authLoading || (isAuthenticated && requiredRole != null && profileLoading);

  if (loading) {
    logger.debug('ProtectedRoute: loading auth/profile state');
    return <SyncPathLoader variant="indeterminate" />;
  }

  if (!isAuthenticated) {
    logger.info('ProtectedRoute: not authenticated, redirecting to /login');
    return <Navigate to="/login" replace />;
  }

  if (requiredRole != null && role !== requiredRole) {
    logger.info(`ProtectedRoute: role "${role}" does not match required "${requiredRole}"`);
    // If role is null (profile row missing or server unreachable), redirect to /login
    // so the user re-authenticates and triggers a fresh attachProfile() upsert.
    // Do NOT redirect to a role-guarded route — that causes an infinite redirect loop.
    if (role === null) {
      return <Navigate to="/login" replace />;
    }
    const redirect = role === 'consultant' ? '/portfolio' : '/portal';
    return <Navigate to={redirect} replace />;
  }

  logger.debug('ProtectedRoute: authenticated, render children');
  return <>{children}</>;
}
