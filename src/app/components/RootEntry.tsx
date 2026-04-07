import { Navigate } from 'react-router';
import { useAuth, isAnonymousUser } from '../hooks/useAuth';
import { useProfile } from '../hooks/useProfile';
import { SyncPathLoader } from './SyncPathLoader';
import { MarketingHome } from '../pages/MarketingHome';

/**
 * `/` — marketing for guests; OAuth callbacks → `/login`; consultants → dashboard; clients → portal.
 */
export function RootEntry() {
  const search = typeof window !== 'undefined' ? window.location.search : '';
  const hash = typeof window !== 'undefined' ? window.location.hash : '';
  const hasAuthCallback =
    search.includes('code=') ||
    hash.includes('access_token=') ||
    hash.includes('error=');
  if (hasAuthCallback) {
    return <Navigate to={`/login${search}${hash}`} replace />;
  }

  const { isAuthenticated, loading: authLoading, user } = useAuth();
  const { role, loading: profileLoading, isConsultant, isClient } = useProfile();

  if (authLoading || (isAuthenticated && profileLoading)) {
    return <SyncPathLoader variant="indeterminate" />;
  }

  if (!isAuthenticated || isAnonymousUser(user)) {
    return <MarketingHome />;
  }

  if (isConsultant) {
    return <Navigate to="/dashboard" replace />;
  }

  if (isClient) {
    return <Navigate to="/portal" replace />;
  }

  if (role === null) {
    return <Navigate to="/login" replace />;
  }

  return <MarketingHome />;
}
