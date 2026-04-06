import { Navigate } from 'react-router';
import { rootRedirectTarget } from '../lib/root-redirect';

/**
 * Sends `/` to `/dashboard`, but if Supabase OAuth (or other auth callback) params landed on the root URL,
 * forward them to `/login` first so `useAuth` can run `exchangeCodeForSession` / `setSession`.
 * A bare `<Navigate to="/dashboard" />` would drop `?code=` or `#access_token=` and leave no session.
 */
export function RootRedirect() {
  return <Navigate to={rootRedirectTarget(window.location.search, window.location.hash)} replace />;
}
