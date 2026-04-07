import { Navigate, useLocation } from 'react-router';
import { useAuth, isAnonymousUser } from '../hooks/useAuth';
import { useProfile } from '../hooks/useProfile';
import { MarketingHome } from '../pages/MarketingHome';

/**
 * Public home. OAuth callbacks are sent to /login.
 * Do not block MarketingHome behind auth/profile spinners: the landing should render
 * immediately while session/profile resolve and consultant/client redirects run in parallel.
 */
export function RootEntry() {
  const { search, hash } = useLocation();
  const hasAuthCallback =
    search.includes('code=') ||
    hash.includes('access_token=') ||
    hash.includes('error=');
  if (hasAuthCallback) {
    return <Navigate to={`/login${search}${hash}`} replace />;
  }

  const { isAuthenticated, loading: authLoading, user } = useAuth();
  const { role, loading: profileLoading, isConsultant, isClient } = useProfile();

  if (!authLoading && isAuthenticated && !isAnonymousUser(user)) {
    if (!profileLoading) {
      if (isConsultant) {
        return <Navigate to="/dashboard" replace />;
      }
      if (isClient) {
        return <Navigate to="/portal" replace />;
      }
      if (role === null) {
        return <Navigate to="/login" replace />;
      }
    }
  }

  return <MarketingHome />;
}
