import { Navigate } from 'react-router';
import { useAuth } from '../hooks/useAuth';
import { useProfile } from '../hooks/useProfile';
import { logger } from '../lib/logger';
import type { UserRole } from '../data/auditTypes';

interface ProtectedRouteProps {
  children: React.ReactNode;
  /** If provided, the route is only accessible by this role. */
  requiredRole?: UserRole;
}

export function ProtectedRoute({ children, requiredRole }: ProtectedRouteProps) {
  const { isAuthenticated, loading: authLoading } = useAuth();
  const { role, loading: profileLoading } = useProfile();

  // Also keep spinner if role is required but hasn't resolved yet (null while loading)
  const loading = authLoading || (isAuthenticated && requiredRole != null && (profileLoading || role == null));

  if (loading) {
    logger.debug('ProtectedRoute: loading auth/profile state');
    return (
      <div
        className="h-screen flex items-center justify-center"
        style={{ backgroundColor: 'var(--bg-canvas)' }}
      >
        <div className="flex flex-col items-center gap-3">
          <div
            className="w-8 h-8 rounded-full border-3 animate-spin"
            style={{ borderColor: 'var(--border-subtle)', borderTopColor: 'var(--glc-blue)' }}
          />
          <span style={{ color: 'var(--text-tertiary)', fontSize: 'var(--text-sm)' }}>Loading...</span>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    logger.info('ProtectedRoute: not authenticated, redirecting to /login');
    return <Navigate to="/login" replace />;
  }

  if (requiredRole != null && role !== requiredRole) {
    // Role mismatch: redirect to the correct home for the actual role.
    // Only redirect to a known destination — never to a route guarded by the same role
    // (which would cause an infinite redirect loop when role is still null).
    logger.info(`ProtectedRoute: role "${role}" does not match required "${requiredRole}"`);
    const redirect = role === 'consultant' ? '/portfolio' : '/portal';
    return <Navigate to={redirect} replace />;
  }

  logger.debug('ProtectedRoute: authenticated, render children');
  return <>{children}</>;
}
